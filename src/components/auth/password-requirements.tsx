import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface PasswordRequirement {
	label: string;
	test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
	{
		label: 'At least 8 characters',
		test: (password) => password.length >= 8,
	},
	{
		label: 'One uppercase letter',
		test: (password) => /[A-Z]/.test(password),
	},
	{
		label: 'One lowercase letter',
		test: (password) => /[a-z]/.test(password),
	},
	{
		label: 'One number',
		test: (password) => /\d/.test(password),
	},
	{
		label: 'One special character',
		test: (password) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
	},
];

interface PasswordRequirementsProps {
	password: string;
	confirmPassword?: string;
	show?: boolean;
}

export function PasswordRequirements({ password, confirmPassword, show = true }: PasswordRequirementsProps) {
	if (!show) return null;

	const passwordsMatch = confirmPassword !== undefined && password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
	const showPasswordsMatch = confirmPassword !== undefined && (password.length > 0 || confirmPassword.length > 0);

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			className="mt-3 space-y-2 text-sm"
		>
			<p className="text-xs text-white/40 mb-2">Password must contain:</p>
			{requirements.map((requirement, index) => {
				const isMet = requirement.test(password);
				const showCheck = password.length > 0;

				return (
					<motion.div
						key={index}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: index * 0.05 }}
						className={clsx(
							'flex items-center gap-2 transition-colors',
							showCheck && isMet && 'text-green-400',
							showCheck && !isMet && 'text-white/40',
							!showCheck && 'text-white/40'
						)}
					>
						<motion.div
							className={clsx(
								'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all',
								showCheck && isMet && 'bg-green-400/20 ring-1 ring-green-400/30',
								showCheck && !isMet && 'bg-white/5',
								!showCheck && 'bg-white/5'
							)}
							animate={showCheck && isMet ? {
								boxShadow: [
									'0 0 0 0 rgba(74, 222, 128, 0.4)',
									'0 0 0 4px rgba(74, 222, 128, 0)',
								],
							} : {}}
							transition={{
								duration: 1,
								repeat: showCheck && isMet ? Infinity : 0,
								ease: 'easeInOut',
							}}
						>
							{showCheck && isMet ? (
								<motion.div
									initial={{ scale: 0, rotate: -180 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{ type: 'spring', stiffness: 200 }}
								>
									<Check className="w-3 h-3 text-green-400" />
								</motion.div>
							) : showCheck && !isMet ? (
								<X className="w-3 h-3 text-white/40" />
							) : (
								<div className="w-1.5 h-1.5 rounded-full bg-white/30" />
							)}
						</motion.div>
						<span className={clsx('text-xs', showCheck && isMet && 'font-medium')}>
							{requirement.label}
						</span>
					</motion.div>
				);
			})}
			{confirmPassword !== undefined && (
				<motion.div
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: requirements.length * 0.05 }}
					className={clsx(
						'flex items-center gap-2 transition-colors',
						showPasswordsMatch && passwordsMatch && 'text-green-400',
						showPasswordsMatch && !passwordsMatch && 'text-white/40',
						!showPasswordsMatch && 'text-white/40'
					)}
				>
					<motion.div
						className={clsx(
							'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all',
							showPasswordsMatch && passwordsMatch && 'bg-green-400/20 ring-1 ring-green-400/30',
							showPasswordsMatch && !passwordsMatch && 'bg-white/5',
							!showPasswordsMatch && 'bg-white/5'
						)}
						animate={showPasswordsMatch && passwordsMatch ? {
							boxShadow: [
								'0 0 0 0 rgba(74, 222, 128, 0.4)',
								'0 0 0 4px rgba(74, 222, 128, 0)',
							],
						} : {}}
						transition={{
							duration: 1,
							repeat: showPasswordsMatch && passwordsMatch ? Infinity : 0,
							ease: 'easeInOut',
						}}
					>
						{showPasswordsMatch && passwordsMatch ? (
							<motion.div
								initial={{ scale: 0, rotate: -180 }}
								animate={{ scale: 1, rotate: 0 }}
								transition={{ type: 'spring', stiffness: 200 }}
							>
								<Check className="w-3 h-3 text-green-400" />
							</motion.div>
						) : showPasswordsMatch && !passwordsMatch ? (
							<X className="w-3 h-3 text-white/40" />
						) : (
							<div className="w-1.5 h-1.5 rounded-full bg-white/30" />
						)}
					</motion.div>
					<span className={clsx('text-xs', showPasswordsMatch && passwordsMatch && 'font-medium')}>
						Passwords match
					</span>
				</motion.div>
			)}
		</motion.div>
	);
}

export function validatePasswordRequirements(password: string): boolean {
	return requirements.every(req => req.test(password));
}
