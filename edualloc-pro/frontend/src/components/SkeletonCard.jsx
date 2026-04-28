// SkeletonCard — premium light-theme skeleton loader
import { motion } from 'framer-motion'

const SkeletonLine = ({ width = '100%', height = '14px', rounded = 'rounded' }) => (
  <div
    className={`bg-slate-200 animate-pulse ${rounded}`}
    style={{ width, height }}
  />
)

export const SkeletonCard = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="bg-white border border-slate-200 rounded-xl p-4 space-y-4"
  >
    <div className="flex items-start justify-between">
      <div className="space-y-2 w-full max-w-[60%]">
        <SkeletonLine width="100%" height="16px" rounded="rounded-md" />
        <SkeletonLine width="60%" height="12px" rounded="rounded-sm" />
      </div>
      <SkeletonLine width="48px" height="24px" rounded="rounded-lg" />
    </div>
    
    <div className="pt-2 border-t border-slate-100 flex gap-3">
      <SkeletonLine width="64px" height="12px" rounded="rounded-sm" />
      <SkeletonLine width="64px" height="12px" rounded="rounded-sm" />
      <div className="ml-auto">
        <SkeletonLine width="48px" height="12px" rounded="rounded-full" />
      </div>
    </div>
  </motion.div>
)

const SkeletonList = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export default SkeletonList
