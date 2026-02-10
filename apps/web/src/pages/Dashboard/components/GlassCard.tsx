import { Card, type CardProps } from "@mui/material";

export default function GlassCard(props: CardProps) {
  return (
    <Card
      elevation={0}
      {...props}
      sx={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "rgba(14, 18, 35, 0.55)",
        "&:before": {
          content: '""',
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(600px 240px at 10% 0%, rgba(124,58,237,0.18), transparent 60%)",
          pointerEvents: "none",
        },
        ...(props.sx || {}),
      }}
    />
  );
}
