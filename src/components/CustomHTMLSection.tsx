import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { type Section } from "@/lib/sectionQueries";

interface CustomHTMLSectionProps {
  section: Section;
}

export const CustomHTMLSection = ({ section }: CustomHTMLSectionProps) => {
  const [height, setHeight] = useState(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type === 'resize' && event.data?.sectionId === section.id) {
      setHeight(Math.max(event.data.height || 100, 50));
    }
  }, [section.id]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const srcDoc = useMemo(() => {
    if (!section.html_content) return '';
    
    const resizeScript = `
      <script>
        function sendHeight() {
          var height = Math.max(
            document.body.scrollHeight,
            document.body.offsetHeight,
            document.documentElement.scrollHeight,
            document.documentElement.offsetHeight
          );
          parent.postMessage({ type: 'resize', sectionId: '${section.id}', height: height }, '*');
        }
        window.addEventListener('load', function() { setTimeout(sendHeight, 100); });
        window.addEventListener('resize', sendHeight);
        new MutationObserver(sendHeight).observe(document.body, { childList: true, subtree: true });
      </script>
    `;

    const baseStyles = `
      <style>
        * { box-sizing: border-box; }
        html, body { 
          margin: 0; 
          padding: 0; 
          overflow: hidden;
          background: transparent;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      </style>
    `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseStyles}
</head>
<body>
  ${section.html_content}
  ${resizeScript}
</body>
</html>`;
  }, [section.html_content, section.id]);

  if (!section.html_content) return null;

  return (
    <div className="mb-2 w-full">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title={`Custom section ${section.id}`}
        className="w-full border-0"
        style={{ 
          height: `${height}px`,
          background: 'transparent'
        }}
        sandbox="allow-scripts"
        loading="lazy"
      />
    </div>
  );
};
