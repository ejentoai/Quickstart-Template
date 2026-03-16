// components/document-badge.tsx
import { FileText, X, File, FileImage, FileArchive } from "lucide-react";
import { useState } from "react";

interface DocumentBadgeProps {
  document: {
    source: string;
    description?: string;
    type?: 'document' | 'image' | 'archive' | 'other';
    size?: string | number;
  };
  onRemove?: () => void;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

const getFileIcon = (type?: string, filename?: string) => {
  const ext = filename?.split('.').pop()?.toLowerCase();
  
  if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) {
    return <FileImage className="h-5 w-5" />;
  }
  if (type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return <FileArchive className="h-5 w-5" />;
  }
  if (type === 'document' || ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return <FileText className="h-5 w-5" />;
  }
  return <File className="h-5 w-5" />;
};

const getFileExtension = (filename: string) => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toUpperCase() : '';
};

export const DocumentBadge = ({ 
  document, 
  onRemove, 
  onClick,
  variant = 'default' 
}: DocumentBadgeProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const filename = document.source.split('/').pop() || document.source;
  const fileExt = getFileExtension(filename);
  const fileIcon = getFileIcon(document.type, filename);

  const getVariantStyles = () => {
    switch(variant) {
      case 'compact':
        return {
          container: "py-2.5 px-4", // Increased from py-1.5 px-3
          text: "max-w-[120px]",
          icon: <FileText className="h-4 w-4" /> // Increased from h-3.5 w-3.5
        };
      case 'detailed':
        return {
          container: "py-4 px-5", // Increased from py-2.5 px-4
          text: "max-w-[200px] font-medium",
          icon: fileIcon
        };
      default:
        return {
          container: "py-3.5 px-4", // Increased from py-2 px-3.5
          text: "max-w-[180px]",
          icon: fileIcon
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
  <div className="relative inline-flex">
    <div
      className={`
        flex items-center gap-3 rounded-xl text-[15px]  // Increased from text-[14px]
        bg-gradient-to-b from-blue-50 to-blue-100/80
        border border-blue-200 text-blue-700
        shadow-sm hover:shadow-lg transition-all duration-200
        ${variantStyles.container}
        ${onClick ? "cursor-pointer hover:from-blue-100 hover:to-blue-200/80 hover:border-blue-300" : ""}
        ${onRemove ? "pr-3" : ""}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={onClick}
    >
      <span className="text-blue-600 flex items-center">
        {variantStyles.icon}
      </span>

      <div className="flex flex-col min-w-0">
        <span className={`${variantStyles.text} truncate leading-tight font-medium`}>
          {filename}
        </span>

        {variant === "detailed" && (fileExt || document.size) && (
          <span className="text-[12px] text-blue-500/80 leading-tight"> {/* Increased from text-[11px] */}
            {fileExt && `${fileExt} • `}
            {document.size && typeof document.size === "number"
              ? `${(document.size / 1024).toFixed(1)} KB`
              : document.size}
          </span>
        )}
      </div>

      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 p-2 rounded-full hover:bg-blue-200/80 text-blue-600 hover:text-blue-800 transition-colors" // Increased from p-1.5
        >
          <X className="h-4 w-4" /> {/* Increased from h-4 w-4 */}
        </button>
      )}
    </div>
  </div>
);
};