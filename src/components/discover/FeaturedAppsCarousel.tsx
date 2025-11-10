import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Eye, TrendingUp } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AppWithUserAndStats } from '@/api-types';

interface FeaturedAppsCarouselProps {
  apps: AppWithUserAndStats[];
  onAppClick: (appId: string) => void;
}

export const FeaturedAppsCarousel: React.FC<FeaturedAppsCarouselProps> = ({ apps, onAppClick }) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  useEffect(() => {
    if (!api || apps.length === 0) return;

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [api, apps.length]);

  if (apps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative mb-12"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-2xl font-bold text-text-primary">Featured Apps</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => api?.scrollPrev()}
            disabled={!api?.canScrollPrev()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => api?.scrollNext()}
            disabled={!api?.canScrollNext()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {apps.map((app) => (
            <CarouselItem key={app.id} className="md:basis-1/2 lg:basis-1/3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="h-full cursor-pointer"
                onClick={() => onAppClick(app.id)}
              >
                <div className="relative h-[300px] rounded-2xl overflow-hidden bg-gradient-to-br from-bg-2 to-bg-3 border border-border-primary group">
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-accent/90 text-white border-0 backdrop-blur-sm font-semibold">
                      FEATURED
                    </Badge>
                  </div>

                  <div className="absolute inset-0">
                    {app.screenshotUrl ? (
                      <img
                        src={app.screenshotUrl}
                        alt={app.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-red-50 via-red-100/80 to-red-200/60 dark:from-red-950/30 dark:via-red-900/20 dark:to-red-800/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-10 w-10 border-2 border-white/20">
                        <AvatarImage src={app.userAvatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-200 to-blue-300 text-white">
                          {app.userName?.charAt(0).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold mb-1 truncate">{app.title}</h3>
                        <p className="text-sm text-white/80">by {app.userName || 'Anonymous'}</p>
                      </div>
                    </div>

                    {app.description && (
                      <p className="text-sm text-white/90 mb-3 line-clamp-2">
                        {app.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Star className={cn(
                          'h-4 w-4',
                          app.userStarred ? 'fill-yellow-400 text-yellow-400' : 'text-white/80'
                        )} />
                        <span className="font-medium">{app.starCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-white/80" />
                        <span className="font-medium">{app.viewCount || 0}</span>
                      </div>
                      {app.framework && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                          {app.framework}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-2 mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              current === index ? 'w-8 bg-accent' : 'w-1.5 bg-border-primary hover:bg-accent/50'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </motion.div>
  );
};
