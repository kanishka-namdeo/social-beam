"use client";

import NextImage from "next/image";

interface MediaPreviewProps {
  mediaUrls: string[];
  className?: string;
}

export function MediaPreview({ mediaUrls, className }: MediaPreviewProps) {
  if (mediaUrls.length === 0) return null;

  if (mediaUrls.length === 1) {
    return (
      <div className={`relative aspect-video overflow-hidden ${className ?? ""}`}>
        <NextImage
          src={mediaUrls[0]}
          alt="Post media"
          fill
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  if (mediaUrls.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${className ?? ""}`}>
        {mediaUrls.slice(0, 2).map((url, i) => (
          <div key={i} className="relative aspect-square overflow-hidden">
            <NextImage
              src={url}
              alt={`Post media ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
      </div>
    );
  }

  if (mediaUrls.length === 3) {
    return (
      <div className={`grid grid-cols-2 gap-1 ${className ?? ""}`}>
        <div className="row-span-2 relative overflow-hidden">
          <NextImage
            src={mediaUrls[0]}
            alt="Post media 1"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="grid grid-cols-1 gap-1">
          {mediaUrls.slice(1, 3).map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden">
              <NextImage
                src={url}
                alt={`Post media ${i + 2}`}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4+ images — show 2x2 grid with "+N" overlay on last
  const displayUrls = mediaUrls.slice(0, 4);
  const overflowCount = mediaUrls.length - 4;

  return (
    <div className={`grid grid-cols-2 gap-1 ${className ?? ""}`}>
      {displayUrls.map((url, i) => (
        <div key={i} className="relative aspect-square overflow-hidden">
          <NextImage
            src={url}
            alt={`Post media ${i + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
          {i === 3 && overflowCount > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-overlay">
              <span className="text-2xl font-semibold text-white">+{overflowCount}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
