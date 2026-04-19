import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7faf4",
          color: "#0d8b43",
          border: "4px solid #0d8b43",
          borderRadius: "50%",
          fontFamily: "serif",
          fontSize: 44,
          fontWeight: 600,
          letterSpacing: "-0.04em",
        }}
      >
        R
      </div>
    ),
    size,
  );
}
