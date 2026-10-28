import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/feedback/Loading";
import { cx } from "@/lib/cx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "btn--primary",
  secondary: "btn--secondary",
  outline: "btn--outline",
  ghost: "btn--ghost",
  danger: "btn--danger",
  success: "btn--success",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "btn--sm",
  md: "",
  lg: "px-6 py-3 text-base",
  icon: "btn--icon",
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "prefix"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
  /** Renders a router `<Link>` instead of a `<button>`. */
  to?: string;
  /** Renders an `<a>` instead of a `<button>`. */
  href?: string;
}

/**
 * The single button primitive.
 *
 * Rendering the right element matters for accessibility: navigation must be a
 * link (so middle-click and "open in new tab" work) while actions stay buttons.
 * The old codebase used `<button onClick={navigate}>` for both.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    to,
    href,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const classes = cx(
    "btn",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    isLoading && "cursor-progress",
    className
  );

  const content = (
    <>
      {isLoading ? <Spinner size="sm" /> : leadingIcon}
      {children}
      {!isLoading && trailingIcon}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || isLoading}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}>
      {content}
    </button>
  );
});

export default Button;
