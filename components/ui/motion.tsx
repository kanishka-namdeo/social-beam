"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.35,
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  }),
};

interface StaggerContainerProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  delay = 0.05,
  className,
}: StaggerContainerProps) {
  const variants: Variants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * delay,
        duration: 0.35,
        type: "spring",
        stiffness: 200,
        damping: 20,
      },
    }),
  };

  const MotionDiv = motion.div;

  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: delay } },
      }}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <MotionDiv key={i} variants={variants} custom={i}>
              {child}
            </MotionDiv>
          ))
        : children}
    </MotionDiv>
  );
}

interface SpringCardProps {
  children: ReactNode;
  className?: string;
}

export function SpringCard({ children, className }: SpringCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: 0.4,
        type: "spring",
        stiffness: 180,
        damping: 18,
      }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface LayoutItemProps {
  children: ReactNode;
  id?: string;
  className?: string;
}

export function LayoutItem({ children, id, className }: LayoutItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 25 },
        opacity: { duration: 0.2 },
      }}
      layoutId={id}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function FadeIn({
  children,
  delay = 0,
  className,
  direction = "up",
}: FadeInProps) {
  const offsetMap = {
    up: { y: 16, x: 0 },
    down: { y: -16, x: 0 },
    left: { x: 16, y: 0 },
    right: { x: -16, y: 0 },
    none: { x: 0, y: 0 },
  };

  const offset = offsetMap[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        delay,
        duration: 0.35,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
