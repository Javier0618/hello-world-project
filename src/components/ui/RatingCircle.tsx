import { cn } from "@/lib/utils"

interface RatingCircleProps {
  rating: number
  className?: string
}

const RatingCircle = ({ rating, className }: RatingCircleProps) => {
  const safeRating = rating ?? 0
  const circumference = 2 * Math.PI * 35
  const offset = circumference - (safeRating / 10) * circumference

  const getRatingColor = () => {
    if (safeRating >= 7) {
      return "stroke-green-500"
    } else if (safeRating >= 4) {
      return "stroke-yellow-500"
    } else {
      return "stroke-red-500"
    }
  }

  return (
    <div className={cn("relative w-9 h-9 md:w-12 md:h-12", className)}>
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle className="stroke-gray-700" cx="50" cy="50" r="35" strokeWidth="8" fill="transparent" />
        <circle
          className={cn("transition-all duration-500", getRatingColor())}
          cx="50"
          cy="50"
          r="35"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-[10px] md:text-sm">{safeRating.toFixed(1)}</span>
      </div>
    </div>
  )
}

export default RatingCircle
