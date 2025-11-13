/**
 * Enhanced Auth Button
 * Provides OAuth + Email/Password authentication with enhanced UI
 */

import { useState } from 'react';
import { LogIn, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAuth } from '../../contexts/auth-context';
import { LoginModal } from './login-modal';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	DropdownMenuGroup,
} from '../ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';

interface AuthButtonProps {
	className?: string;
}

export function AuthButton({ className }: AuthButtonProps) {
	const {
		user,
		isAuthenticated,
		isLoading,
		error,
		login, // OAuth method
		loginWithEmail,
		register,
		logout,
		clearError,
	} = useAuth();

	const navigate = useNavigate();
	const [showLoginModal, setShowLoginModal] = useState(false);

	if (isLoading) {
		return <Skeleton className="w-10 h-10 rounded-full" />;
	}

	if (!isAuthenticated || !user) {
		return (
			<>
				<motion.button
					onClick={() => setShowLoginModal(true)}
					className={clsx(
						'relative overflow-hidden px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm border border-purple-500/30 hover:border-purple-400/50 transition-all flex items-center gap-2 text-white/70 hover:text-white group',
						className
					)}
					whileHover={{ scale: 1.05, x: -2 }}
					whileTap={{ scale: 0.98 }}
					animate={{
						boxShadow: [
							'0 0 20px rgba(168, 85, 247, 0)',
							'0 0 20px rgba(168, 85, 247, 0.4)',
							'0 0 20px rgba(168, 85, 247, 0)',
						],
					}}
					transition={{
						boxShadow: {
							duration: 2,
							repeat: Infinity,
							ease: 'easeInOut',
						},
					}}
				>
					{/* Shimmer effect */}
					<motion.div
						className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
						animate={{
							x: ['-100%', '200%'],
						}}
						transition={{
							duration: 3,
							repeat: Infinity,
							ease: 'linear',
						}}
					/>
					<LogIn className="h-4 w-4 relative z-10" />
					<span className="relative z-10">Sign In</span>
				</motion.button>

				<LoginModal
					isOpen={showLoginModal}
					onClose={() => setShowLoginModal(false)}
					onLogin={(provider) => {
						login(provider);
						setShowLoginModal(false);
					}}
					onEmailLogin={async (credentials) => {
						await loginWithEmail(credentials);
						if (!error) {
							setShowLoginModal(false);
						}
					}}
					onOAuthLogin={(provider) => {
						login(provider);
						setShowLoginModal(false);
					}}
					onRegister={async (data) => {
						await register(data);
						if (!error) {
							setShowLoginModal(false);
						}
					}}
					error={error}
					onClearError={clearError}
				/>
			</>
		);
	}

	// Get user initials for avatar fallback
	const getInitials = () => {
		if (user.displayName) {
			return user.displayName
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2);
		}
		return user.email.charAt(0).toUpperCase();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<motion.button
					className="relative rounded-full hover:ring-2 hover:ring-purple-500/30 transition-all p-1"
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
				>
					<Avatar className="h-8 w-8 ring-2 ring-purple-500/20">
						<AvatarImage
							src={user.avatarUrl}
							alt={user.displayName || user.email}
						/>
						<AvatarFallback className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white font-semibold backdrop-blur-sm">
							{getInitials()}
						</AvatarFallback>
					</Avatar>
					{user.emailVerified && (
						<motion.div
							className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]"
							animate={{
								boxShadow: [
									'0 0 0 0 rgba(34, 197, 94, 0.4)',
									'0 0 0 4px rgba(34, 197, 94, 0)',
								],
							}}
							transition={{
								duration: 2,
								repeat: Infinity,
								ease: 'easeInOut',
							}}
						/>
					)}
				</motion.button>
			</DropdownMenuTrigger>

			<AnimatePresence>
				<DropdownMenuContent align="end" className="w-72 bg-[#0f0f1a]/95 backdrop-blur-xl border-white/10 text-white" asChild>
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.2, type: 'spring' }}
					>
						<DropdownMenuLabel className="p-0">
							<div className="flex items-start gap-3 p-4 border-b border-white/10">
								<Avatar className="h-12 w-12 ring-2 ring-purple-500/30">
									<AvatarImage
										src={user.avatarUrl}
										alt={user.displayName || user.email}
									/>
									<AvatarFallback className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white font-semibold text-lg backdrop-blur-sm">
										{getInitials()}
									</AvatarFallback>
								</Avatar>
								<div className="flex flex-col gap-1 flex-1">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-white">
											{user.displayName || 'User'}
										</span>
									</div>
									<span className="text-xs text-white/50">
										{user.email}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>

						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => navigate('/settings')}
								className="cursor-pointer hover:bg-white/10 focus:bg-white/10 text-white/70 hover:text-white transition-colors"
							>
								<Settings className="mr-1 h-4 w-4" />
								Settings
							</DropdownMenuItem>
						</DropdownMenuGroup>

						<DropdownMenuItem
							onClick={() => logout()}
							className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 transition-colors"
						>
							<LogOut className="mr-1 h-4 w-4" />
							Sign Out
						</DropdownMenuItem>
					</motion.div>
				</DropdownMenuContent>
			</AnimatePresence>
		</DropdownMenu>
	);
}
