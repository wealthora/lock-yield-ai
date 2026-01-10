import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, User } from "lucide-react";

// Predefined avatar options - neutral illustrated icons
export const AVATAR_OPTIONS = [
  "/avatars/avatar-1.svg",
  "/avatars/avatar-2.svg",
  "/avatars/avatar-3.svg",
  "/avatars/avatar-4.svg",
  "/avatars/avatar-5.svg",
  "/avatars/avatar-6.svg",
  "/avatars/avatar-7.svg",
  "/avatars/avatar-8.svg",
];

export const DEFAULT_AVATAR = "/avatars/avatar-1.svg";

interface AvatarSelectorProps {
  selectedAvatar: string | null;
  onSelect: (avatar: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AvatarSelector({ 
  selectedAvatar, 
  onSelect, 
  disabled = false,
  className 
}: AvatarSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm text-muted-foreground">Choose your avatar:</p>
      <div 
        className="grid grid-cols-4 gap-3"
        role="radiogroup"
        aria-label="Select avatar"
      >
        {AVATAR_OPTIONS.map((avatar, index) => {
          const isSelected = selectedAvatar === avatar;
          return (
            <button
              key={avatar}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Avatar option ${index + 1}`}
              disabled={disabled}
              onClick={() => onSelect(avatar)}
              className={cn(
                "relative p-1 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : "hover:ring-2 hover:ring-muted-foreground/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                <AvatarImage 
                  src={avatar} 
                  alt={`Avatar option ${index + 1}`}
                  className="object-cover"
                />
                <AvatarFallback>
                  <User className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              {isSelected && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface UserAvatarProps {
  src?: string | null;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const fallbackTextSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-xl",
  xl: "text-2xl",
};

export function UserAvatar({ 
  src, 
  fallback = "U", 
  className,
  size = "md" 
}: UserAvatarProps) {
  const avatarSrc = src || DEFAULT_AVATAR;
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={avatarSrc} 
        alt="User avatar"
        className="object-cover"
      />
      <AvatarFallback className={fallbackTextSizes[size]}>
        {fallback.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
