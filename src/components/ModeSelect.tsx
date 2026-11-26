import { Box, CardActionArea, Paper, Stack, Typography } from "@mui/material";
import { EDIT_MODES } from "../lib/types";
import { Icon } from "@iconify/react";
import type { EditMode } from "../lib/types";

const ICONS: Record<string, string> = {
  moment: "lucide:zap",
  maker: "lucide:scissors",
  ranking: "lucide:trophy",
  compilation: "lucide:layers",
  quotes: "lucide:quote",
  images: "lucide:image",
};

export default function ModeSelect({
  selected,
  onSelect,
}: {
  selected: EditMode | null;
  onSelect: (m: EditMode) => void;
}) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4">Editing mode</Typography>
        <Typography variant="body2" color="text.secondary">
          Pick how your sources should be cut — you can change it later by coming back to this step.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          gap: 2,
        }}
      >
        {EDIT_MODES.map((m) => {
          const active = selected === m.id;
          return (
            <Paper
              key={m.id}
              variant="outlined"
              sx={{
                borderColor: active ? "primary.main" : "divider",
                boxShadow: active ? (t) => `0 0 0 1px ${t.palette.primary.main}` : "none",
                height: "100%",
              }}
            >
              <CardActionArea
                onClick={() => onSelect(m.id)}
                sx={{ height: "100%", p: 2.5, display: "flex", flexDirection: "column", alignItems: "flex-start" }}
              >
                <Box
                  sx={{
                    mb: 1.5,
                    width: 40,
                    height: 40,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: active ? "primary.main" : "rgba(76,192,206,0.12)",
                    color: active ? "primary.contrastText" : "primary.main",
                  }}
                >
                  <Icon icon={ICONS[m.icon]} width={20} height={20} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {m.title}
                </Typography>
                <Typography variant="caption" color="primary" sx={{ mb: 1 }}>
                  {m.subtitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {m.description}
                </Typography>
              </CardActionArea>
            </Paper>
          );
        })}
      </Box>
    </Stack>
  );
}
