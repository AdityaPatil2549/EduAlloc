// SkeletonCard — never use spinners, always skeleton loaders
import { motion } from 'framer-motion'

const SkeletonLine = ({ width = '100%', height = '14px' }) => (
  <div
    className="skeleton rounded"
    style={{ width, height, marginBottom: '8px' }}
  />
)

export const SkeletonCard = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="glass-card p-4 space-y-3"
  >
    <div className="flex items-start justify-between">
      <SkeletonLine width="60%" height="16px" />
      <SkeletonLine width="60px" height="24px" />
    </div>
    <SkeletonLine width="40%" height="12px" />
    <div className="flex gap-4">
      <SkeletonLine width="80px" height="12px" />
      <SkeletonLine width="80px" height="12px" />
    </div>
    <SkeletonLine width="100%" height="8px" />
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
