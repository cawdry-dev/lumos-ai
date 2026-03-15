import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { ChartRenderer } from "@/components/chart-renderer";
import {
  CopyIcon,
  LineChartIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";

type ChartMetadata = Record<string, never>;

export const chartArtifact = new Artifact<"chart", ChartMetadata>({
  kind: "chart",
  description:
    "Useful for visualising data as interactive charts (bar, line, pie, area, scatter).",
  initialize: () => null,
  onStreamPart: ({ setArtifact, streamPart }) => {
    if (streamPart.type === "data-chartDelta") {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.data,
        isVisible: true,
        status: "streaming",
      }));
    }
  },
  content: ({ content, isLoading }) => {
    if (isLoading) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
          Loading chart…
        </div>
      );
    }

    return <ChartRenderer content={content} />;
  },
  actions: [
    {
      icon: <UndoIcon size={18} />,
      description: "View previous version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => currentVersionIndex === 0,
    },
    {
      icon: <RedoIcon size={18} />,
      description: "View next version",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => isCurrentVersion,
    },
    {
      icon: <CopyIcon size={18} />,
      description: "Copy chart data to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Chart data copied to clipboard!");
      },
    },
  ],
  toolbar: [
    {
      icon: <LineChartIcon />,
      description: "Change chart type",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "Please change the chart type to a different visualisation that better suits this data.",
            },
          ],
        });
      },
    },
  ],
});

