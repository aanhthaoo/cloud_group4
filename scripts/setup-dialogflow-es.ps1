param(
  [string]$ProjectId = "salon-499416",
  [string]$ConfigPath = "scripts/dialogflow/agent-config.json",
  [string]$GcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
  [switch]$SkipEnableApi
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $GcloudPath)) {
  throw "gcloud was not found at: $GcloudPath"
}

if (!(Test-Path -LiteralPath $ConfigPath)) {
  throw "Dialogflow config was not found at: $ConfigPath"
}

$config = Get-Content -Raw -Encoding UTF8 -LiteralPath $ConfigPath | ConvertFrom-Json

function Get-AccessToken {
  $token = & $GcloudPath auth print-access-token
  if (!$token) {
    throw "Could not get a gcloud access token. Run: gcloud auth login"
  }
  return $token.Trim()
}

function Invoke-DialogflowApi {
  param(
    [ValidateSet("GET", "POST", "PATCH", "DELETE")]
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $headers = @{
    Authorization = "Bearer $(Get-AccessToken)"
  }

  $uri = "https://dialogflow.googleapis.com/v2/$Path"
  $params = @{
    Method = $Method
    Uri = $uri
    Headers = $headers
    ContentType = "application/json; charset=utf-8"
  }

  if ($null -ne $Body) {
    $jsonBody = $Body | ConvertTo-Json -Depth 30 -Compress
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
  }

  try {
    return Invoke-RestMethod @params
  } catch {
    $detail = $_.Exception.Message
    if ($_.Exception.Response) {
      try {
        $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $detail = $reader.ReadToEnd()
      } catch {
        $detail = $_.Exception.Message
      }
    }
    throw "Dialogflow API request failed: $Method $uri`n$detail"
  }
}

Write-Host "Using gcloud account:"
& $GcloudPath config get-value account
& $GcloudPath config set project $ProjectId | Out-Host

if (!$SkipEnableApi) {
  Write-Host "Enabling Dialogflow API if permitted..."
  & $GcloudPath services enable dialogflow.googleapis.com --project $ProjectId | Out-Host
}

Write-Host "Creating/updating Dialogflow ES agent..."
$agentBody = @{
  displayName = $config.agent.displayName
  defaultLanguageCode = $config.agent.defaultLanguageCode
  supportedLanguageCodes = @($config.agent.supportedLanguageCodes)
  timeZone = $config.agent.timeZone
  description = $config.agent.description
  matchMode = "MATCH_MODE_HYBRID"
  mlMinConfidence = 0.3
}
Invoke-DialogflowApi -Method POST -Path "projects/$ProjectId/agent" -Body $agentBody | Out-Null

function New-EntityTypeBody {
  param(
    [object]$EntityType,
    [object[]]$Entries
  )

  $bodyEntities = @()
  foreach ($entry in @($Entries)) {
    $bodyEntities += @{
      value = $entry.value
      synonyms = @($entry.synonyms)
    }
  }

  return @{
    displayName = $EntityType.displayName
    kind = "KIND_MAP"
    autoExpansionMode = "AUTO_EXPANSION_MODE_DEFAULT"
    entities = $bodyEntities
  }
}

function New-IntentBody {
  param(
    [object]$Intent,
    [object[]]$TrainingPhrases,
    [object[]]$Responses,
    [bool]$IncludeCommonFields = $true
  )

  $phraseBodies = @()
  foreach ($phrase in @($TrainingPhrases)) {
    $phraseBodies += @{
      type = "EXAMPLE"
      parts = @(@{ text = $phrase })
    }
  }

  $body = @{
    displayName = $Intent.displayName
    trainingPhrases = $phraseBodies
    messages = @(
      @{
        text = @{
          text = @($Responses)
        }
      }
    )
  }

  if ($IncludeCommonFields) {
    if ($Intent.webhookState) {
      $body.webhookState = $Intent.webhookState
    }

    if ($Intent.parameters) {
      $parameters = @()
      foreach ($parameter in @($Intent.parameters)) {
        $parameters += @{
          displayName = $parameter.displayName
          entityTypeDisplayName = $parameter.entityTypeDisplayName
          value = $parameter.value
          mandatory = $false
          isList = $false
        }
      }
      $body.parameters = $parameters
    }
  }

  return $body
}

Write-Host "Reading existing entity types..."
$entityList = Invoke-DialogflowApi -Method GET -Path "projects/$ProjectId/agent/entityTypes?pageSize=1000"
$entityByDisplayName = @{}
if ($entityList.entityTypes) {
  foreach ($entityType in @($entityList.entityTypes)) {
    if ($entityType -and $entityType.displayName) {
      $entityByDisplayName[$entityType.displayName] = $entityType.name
    }
  }
}

foreach ($entityType in @($config.entityTypes)) {
  $viEntries = if ($entityType.entitiesVi) { @($entityType.entitiesVi) } else { @($entityType.entities) }
  $body = New-EntityTypeBody -EntityType $entityType -Entries $viEntries

  if ($entityByDisplayName.ContainsKey($entityType.displayName)) {
    Write-Host "Updating entity type: $($entityType.displayName)"
    $name = $entityByDisplayName[$entityType.displayName]
    Invoke-DialogflowApi -Method PATCH -Path "${name}?updateMask=kind,autoExpansionMode,entities" -Body $body | Out-Null
  } else {
    Write-Host "Creating entity type: $($entityType.displayName)"
    $createdEntityType = Invoke-DialogflowApi -Method POST -Path "projects/$ProjectId/agent/entityTypes" -Body $body
    $name = $createdEntityType.name
    $entityByDisplayName[$entityType.displayName] = $name
  }

  if ($entityType.entitiesEn) {
    Write-Host "Updating English entity entries: $($entityType.displayName)"
    $enBody = New-EntityTypeBody -EntityType $entityType -Entries @($entityType.entitiesEn)
    Invoke-DialogflowApi -Method PATCH -Path "${name}?languageCode=en&updateMask=entities" -Body $enBody | Out-Null
  }
}

Write-Host "Reading existing intents..."
$intentList = Invoke-DialogflowApi -Method GET -Path "projects/$ProjectId/agent/intents?pageSize=1000&intentView=INTENT_VIEW_FULL"
$intentByDisplayName = @{}
if ($intentList.intents) {
  foreach ($intent in @($intentList.intents)) {
    if ($intent -and $intent.displayName) {
      $intentByDisplayName[$intent.displayName] = $intent.name
    }
  }
}

foreach ($legacyIntentName in @($config.legacyIntentNames)) {
  if ($intentByDisplayName.ContainsKey($legacyIntentName)) {
    Write-Host "Deleting legacy intent: $legacyIntentName"
    Invoke-DialogflowApi -Method DELETE -Path $intentByDisplayName[$legacyIntentName] | Out-Null
    $intentByDisplayName.Remove($legacyIntentName)
  }
}

foreach ($intent in @($config.intents)) {
  $viTrainingPhrases = if ($intent.trainingPhrasesVi) { @($intent.trainingPhrasesVi) } else { @($intent.trainingPhrases) }
  $viResponses = if ($intent.responsesVi) { @($intent.responsesVi) } else { @($intent.responses) }
  $body = New-IntentBody -Intent $intent -TrainingPhrases $viTrainingPhrases -Responses $viResponses -IncludeCommonFields $true

  if ($intentByDisplayName.ContainsKey($intent.displayName)) {
    Write-Host "Updating intent: $($intent.displayName)"
    $name = $intentByDisplayName[$intent.displayName]
    Invoke-DialogflowApi -Method PATCH -Path "${name}?updateMask=trainingPhrases,messages,parameters,webhookState" -Body $body | Out-Null
  } else {
    Write-Host "Creating intent: $($intent.displayName)"
    $createdIntent = Invoke-DialogflowApi -Method POST -Path "projects/$ProjectId/agent/intents" -Body $body
    $name = $createdIntent.name
    $intentByDisplayName[$intent.displayName] = $name
  }

  if ($intent.trainingPhrasesEn -or $intent.responsesEn) {
    Write-Host "Updating English intent text: $($intent.displayName)"
    $enTrainingPhrases = if ($intent.trainingPhrasesEn) { @($intent.trainingPhrasesEn) } else { @() }
    $enResponses = if ($intent.responsesEn) { @($intent.responsesEn) } else { @() }
    $enBody = New-IntentBody -Intent $intent -TrainingPhrases $enTrainingPhrases -Responses $enResponses -IncludeCommonFields $false
    Invoke-DialogflowApi -Method PATCH -Path "${name}?languageCode=en&updateMask=trainingPhrases,messages" -Body $enBody | Out-Null
  }
}

Write-Host "Training agent..."
Invoke-DialogflowApi -Method POST -Path "projects/$ProjectId/agent:train" -Body @{} | Out-Null

Write-Host "Done. Dialogflow ES agent prepared for project $ProjectId."
