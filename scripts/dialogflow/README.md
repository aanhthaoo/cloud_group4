# Dialogflow ES setup

This folder contains the Dialogflow ES setup for Minh's chatbot module.

## What it creates

- Agent: `Kich_Ban_Dat_Lich_New`
- Default language: Vietnamese (`vi`)
- Additional language: English (`en`)
- Time zone: `Asia/Ho_Chi_Minh`
- Entity types: `service_type`, `budget_range`, `handoff_signal`
- Intents: `FAQ - GioMoCua`, `FAQ - BangGia`, `TracNghiem - 1 - BatDau`, `TracNghiem - 2 - ChamSocDa`, `TracNghiem - 3 - DaDauMun`, `TracNghiem - 4 - ThuGianDauVai`, `DatLich - KiemTraLichTrong`, `YeuCau - GapNhanVien`

## Run

Use an account that can enable APIs and manage Dialogflow agents. The setup script writes Vietnamese and English training phrases/responses with UTF-8 encoding:

```powershell
$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
& $gcloud auth login
& $gcloud config set project salon-499416
.\scripts\setup-dialogflow-es.ps1 -ProjectId salon-499416
```

If Dialogflow API is already enabled and your account only has Dialogflow agent permissions:

```powershell
.\scripts\setup-dialogflow-es.ps1 -ProjectId salon-499416 -SkipEnableApi
```

## Required IAM permissions

The current `service-account.json` account is useful for backend runtime, but it does not currently have enough permissions to create the Dialogflow agent. The setup account needs permissions such as:

- `serviceusage.services.enable`
- `dialogflow.agents.create`
- `dialogflow.agents.update`
- `dialogflow.entityTypes.create`
- `dialogflow.intents.create`

In practice, for class-project setup, the project owner can run the script once, or grant the backend service account an appropriate Dialogflow role plus Service Usage Admin for the API enable step.

## HubSpot handoff transcript

To save the AI transcript into HubSpot CRM when handing off to a human, create a HubSpot Private App token with contact and note read/write scopes, then add it to the backend environment:

```env
HUBSPOT_PRIVATE_APP_TOKEN=pat-...
```

If this token is missing, the web app can still open HubSpot LiveChat, but the transcript note will not be saved to the contact timeline.
