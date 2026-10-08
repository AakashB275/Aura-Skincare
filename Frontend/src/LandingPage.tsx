import { useNavigate } from 'react-router-dom'
import { useAuth } from "./context/useAuth"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import {
  Star,
  Quote,
  Award,
  User,
  Calendar,
} from 'lucide-react'

type Review = {
  name: string
  role: string
  rating: number
  review: string
  date: string
  gradient: string
  verified?: boolean
}
function SwiperReview({ name, role, rating, review, date, gradient, verified }: Review) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl transition-all duration-700 transform">
      <div className={`absolute inset-0 ${gradient}`}></div>
      <div className="absolute inset-0 bg-white/5 transition-all duration-300"></div>

      <div className="relative z-10 p-6 h-full flex flex-col min-h-80">
        {verified && (
          <div className="absolute top-4 right-4">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 shadow-sm">
              <Award size={14} />
              Verified
            </span>
          </div>
        )}

        <div className="mb-4">
          <Quote size={32} className="text-gray-400" />
        </div>

        <div className="flex-1 mb-6">
          <p className="text-gray-800 text-lg leading-relaxed italic">"{review}"</p>
        </div>

        <div className="flex items-center mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              size={20}
              className={`${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} transition-colors duration-300`}
            />
          ))}
          <span className="text-gray-700 ml-2 font-semibold">{rating}.0</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/80 shadow-sm flex items-center justify-center">
              <User size={20} className="text-gray-600" />
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold">{name}</h4>
              <p className="text-gray-600 text-sm">{role}</p>
            </div>
          </div>
          <div className="text-gray-500 text-sm flex items-center gap-1">
            <Calendar size={14} />
            {date}
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const reviews: Review[] = [
    {
      name: 'Priya S.',
      role: 'Homemaker',
      rating: 5,
      review: "I've tried a lot of serums, but the Vitamin C Serum is the first one that didn't irritate my skin. My dark spots look lighter after about a month, and the 30ml bottle lasts well.",
      date: 'Oct 2026',
      gradient: 'bg-blue-100',
      verified: true,
    },
    {
      name: 'Sagar Vaiydya',
      role: 'Product Manager',
      rating: 5,
      review:"Finally, a sunscreen that doesn't leave a white cast or feel greasy. The SPF 50 sits well under makeup, and I wear it daily now, even indoors.",
      date: 'July 2026',
      gradient: 'bg-purple-100',
      verified: true,
    },
    {
      name: 'Meera K.',
      role: 'Student',
      rating: 5,
      review: "Delivery was on time and the packaging was neat. When I had a question about my order, the support team answered clearly and told me exactly what the policy was.",
      date: 'Sept 2026',
      gradient: 'bg-teal-100',
      verified: true,
    },
  ]

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-bold text-pink-500">Welcome to Aura Skincare</h1>
        <p className="mt-4 text-lg text-gray-700">
          Simple skin. Honest ingredients
        </p>
        <button
          onClick={() => {
            if (isLoggedIn) {
              navigate('/home')
            } else {
              window.dispatchEvent(new Event('aura:open-login'))
            }
          }}
          className="mt-6 px-6 py-3 text-white font-semibold bg-pink-500 rounded-lg shadow-md hover:bg-pink-600 transition"
        >
          Start a call
        </button>
        <h2 className="text-3xl font-bold text-gray-900 mt-20 mb-8 text-center">
          Testimonials
        </h2>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 4000 }}
          className="pb-12"
        >
          {reviews.map((review) => (
            <SwiperSlide key={review.name}>
              <SwiperReview {...review} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export default LandingPage
