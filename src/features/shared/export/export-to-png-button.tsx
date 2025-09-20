"use client";

import { useState, type RefObject } from "react";
import { Download } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { captureElementToPng } from "@/lib/exportImage";

interface ExportToPngButtonProps extends Omit<ButtonProps, "onClick"> {
  targetRef: RefObject<HTMLElement | null>;
  fileName: string;
  label?: string;
}

export function ExportToPngButton({
  targetRef,
  fileName,
  label = "Export PNG",
  disabled,
  ...buttonProps
}: ExportToPngButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;
    const node = targetRef.current;
    if (!node) {
      window.alert("Unable to export image. Please try again once the content loads.");
      return;
    }
    setIsExporting(true);
    try {
      const dataUrl = await captureElementToPng(node);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName.endsWith(".png") ? fileName : `${fileName}.png`;
      link.click();
    } catch {
      window.alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      {...buttonProps}
      disabled={disabled ?? isExporting}
      onClick={handleExport}
      aria-label={label}
    >
      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
      {isExporting ? "Exporting…" : label}
    </Button>
  );
}

