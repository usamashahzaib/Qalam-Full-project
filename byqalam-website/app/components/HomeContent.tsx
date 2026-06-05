"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { Stagger, StaggerItem } from "./Stagger"

export function HomeContent() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {/* Logo — animates in on load */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
        </motion.div>

        {/* Heading + paragraph — staggered scroll-triggered reveal */}
        <Stagger
          className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left"
          staggerDelay={0.12}
          delayChildren={0.1}
        >
          <StaggerItem>
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              To get started, edit the page.tsx file.
            </h1>
          </StaggerItem>

          <StaggerItem>
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Looking for a starting point or more instructions? Head over to{" "}
              <motion.a
                href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                className="font-medium text-zinc-950 dark:text-zinc-50 underline-offset-2"
                whileHover={{ opacity: 0.65 }}
                transition={{ duration: 0.15 }}
              >
                Templates
              </motion.a>{" "}
              or the{" "}
              <motion.a
                href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                className="font-medium text-zinc-950 dark:text-zinc-50 underline-offset-2"
                whileHover={{ opacity: 0.65 }}
                transition={{ duration: 0.15 }}
              >
                Learning
              </motion.a>{" "}
              center.
            </p>
          </StaggerItem>
        </Stagger>

        {/* CTA buttons — staggered scroll-triggered reveal with hover effects */}
        <Stagger
          className="flex flex-col gap-4 text-base font-medium sm:flex-row"
          staggerDelay={0.1}
          delayChildren={0.05}
        >
          <StaggerItem>
            <motion.a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background md:w-[158px]"
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.04, transition: { duration: 0.2, ease: "easeOut" } }}
              whileTap={{ scale: 0.96 }}
            >
              <Image
                className="dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={16}
                height={16}
              />
              Deploy Now
            </motion.a>
          </StaggerItem>

          <StaggerItem>
            <motion.a
              className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 dark:border-white/[.145] md:w-[158px]"
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{
                scale: 1.04,
                backgroundColor: "rgba(0,0,0,0.04)",
                borderColor: "transparent",
                transition: { duration: 0.2, ease: "easeOut" },
              }}
              whileTap={{ scale: 0.96 }}
            >
              Documentation
            </motion.a>
          </StaggerItem>
        </Stagger>
      </main>
    </div>
  )
}
