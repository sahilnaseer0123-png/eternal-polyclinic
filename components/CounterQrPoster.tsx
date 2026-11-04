"use client";

// Printable A4 reception-counter poster with two QR codes (online booking, lab/scan reports on WhatsApp).
// QR codes are vector SVGs generated in the browser, so they print crisply and need no network.

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { clinic } from "@/data/clinic";

function useQrSvg(url: string): string {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((out) => {
        if (active) setSvg(out);
      })
      .catch(() => {
        if (active) setSvg("");
      });
    return () => {
      active = false;
    };
  }, [url]);
  return svg;
}

function QrCard({ title, hint, url }: { title: string; hint: string; url: string }) {
  const svg = useQrSvg(url);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-black p-5 text-center">
      <h3 className="text-xl font-bold leading-tight">{title}</h3>
      <div
        role="img"
        aria-label={`QR code: ${title}`}
        className="size-56 [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <p className="text-sm">{hint}</p>
    </div>
  );
}

export function CounterQrPoster() {
  return (
    <div className="mx-auto max-w-3xl p-6 text-black">
      <div className="border-b-2 border-black pb-3 text-center">
        <h2 className="text-3xl font-bold">{clinic.name}</h2>
      </div>
      <p className="mt-4 text-center text-lg font-semibold">Scan with your phone camera</p>
      <div className="mt-4 grid grid-cols-2 gap-5">
        <QrCard
          title="Book a Specialist Online"
          hint="Pick your doctor and time. Get your token instantly on WhatsApp."
          url={`${clinic.siteUrl}/book`}
        />
        <QrCard
          title="Get Lab & Scan Reports on WhatsApp"
          hint="Send your name and receipt number. Your PDF report arrives in chat."
          url={clinic.reportRequestUrl}
        />
      </div>
      <p className="mt-5 text-center text-base">
        Need help? Call <strong>{clinic.phoneDisplay}</strong> · {clinic.siteUrl.replace("https://", "")}
      </p>
    </div>
  );
}
