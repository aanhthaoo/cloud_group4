import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

interface RecaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

/**
 * Widget reCAPTCHA v2 (checkbox "Tôi không phải robot").
 *
 * Cần biến môi trường VITE_RECAPTCHA_SITE_KEY (lấy Site key tại
 * https://www.google.com/recaptcha/admin, chọn loại "reCAPTCHA v2 - Checkbox").
 * Script `recaptcha/api.js` được nhúng sẵn trong index.html.
 */
export default function Recaptcha({ onVerify, onExpire }: RecaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

  // Script reCAPTCHA load async -> cần đợi window.grecaptcha xuất hiện trước khi render
  useEffect(() => {
    if (window.grecaptcha) {
      setScriptReady(true);
      return;
    }
    const interval = setInterval(() => {
      if (window.grecaptcha) {
        setScriptReady(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || widgetIdRef.current !== null) return;
    if (!siteKey) return;

    widgetIdRef.current = window.grecaptcha!.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "expired-callback": onExpire,
    });
  }, [scriptReady, siteKey, onVerify, onExpire]);

  if (!siteKey) {
    return (
      <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md p-3">
        Thiếu biến môi trường <code>VITE_RECAPTCHA_SITE_KEY</code>. Tạo file{" "}
        <code>.env</code> trong <code>artifacts/spa-booking</code> và khai báo key
        (xem hướng dẫn tại{" "}
        <a
          href="https://www.google.com/recaptcha/admin"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google reCAPTCHA admin
        </a>
        ).
      </div>
    );
  }

  return <div ref={containerRef} data-testid="recaptcha-widget" />;
}
