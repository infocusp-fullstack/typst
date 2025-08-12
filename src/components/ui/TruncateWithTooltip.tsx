import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import React, { useEffect, useRef, useState, ReactElement } from "react";

export function TruncateWithTooltip<T extends HTMLElement = HTMLElement>({
  children,
  tooltip,
}: {
  children: (props: { ref: React.Ref<T> }) => ReactElement;
  tooltip: React.ReactNode;
}) {
  const ref = useRef<T | null>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = ref.current as unknown as HTMLElement | null;
    if (!el) return;

    const checkClamped = () => {
      const clamped = el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      setIsClamped(clamped);
    };

    checkClamped();
    window.addEventListener("resize", checkClamped);
    return () => window.removeEventListener("resize", checkClamped);
  }, [tooltip]);

  const element = children({ ref });

  if (!isClamped) return element;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{element}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
