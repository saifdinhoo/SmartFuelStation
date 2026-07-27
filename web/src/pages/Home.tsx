import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';

// Temporary placeholder — proves the scaffold (Tailwind, Framer Motion,
// Lucide icons) renders correctly. Real pages come in later tasks.
export function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <Wrench className="h-10 w-10 text-blue-600 dark:text-blue-400" />
      <h1 className="text-2xl font-semibold">Smart Automotive Service Platform</h1>
      <p className="text-gray-500 dark:text-gray-400">Web dashboard scaffold ready.</p>
    </motion.div>
  );
}
