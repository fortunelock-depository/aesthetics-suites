'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const number: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.92, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 80, damping: 16 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 18 },
  },
};

export default function NotFound() {
  return (
    <section className="flex min-h-dvh items-center justify-center overflow-hidden px-6 py-24">
      <motion.div
        className="text-center"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={number}
          className="text-8xl font-medium leading-none tracking-tight md:text-9xl"
        >
          404
        </motion.p>

        <motion.h1
          variants={item}
          className="mt-6 text-2xl font-medium text-foreground md:text-3xl"
        >
          Page not found
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-3 max-w-md text-lg leading-relaxed text-muted-foreground"
        >
          The page you&apos;re looking for doesn&apos;t exist or has been
          moved. Let&apos;s get you back on track.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild className="gap-2">
            <Link href={routes.home}>
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
