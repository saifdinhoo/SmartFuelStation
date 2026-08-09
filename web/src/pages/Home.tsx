import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';

// Temporary placeholder — proves the scaffold renders correctly and links
// to the pages built so far. Real landing page comes in a later task.
export function Home() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <Wrench className="h-10 w-10 text-primary" />
      <h1 className="text-heading-2">Smart Automotive Service Platform</h1>
      <p className="text-caption">Web dashboard scaffold ready.</p>
      <nav className="mt-4 flex gap-4 text-sm text-primary underline">
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      
        <Link to="/forgot-password">Forgot password</Link>
   
      </nav>
    </motion.div>
  );
}
