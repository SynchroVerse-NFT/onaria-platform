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
			<p className="text-xs text-muted-foreground mb-2">Password must contain:</p>
			{requirements.map((requirement, index) => {
				const isMet = requirement.test(password);
				const showCheck = password.length > 0;

				return (
					<div
						key={index}
						className={clsx(
							'flex items-center gap-2 transition-colors',
							showCheck && isMet && 'text-green-600 dark:text-green-400',
							showCheck && !isMet && 'text-muted-foreground',
							!showCheck && 'text-muted-foreground'
						)}
					>
						<div
							className={clsx(
								'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors',
								showCheck && isMet && 'bg-green-600/20 dark:bg-green-400/20',
								showCheck && !isMet && 'bg-muted',
								!showCheck && 'bg-muted'
							)}
						>
							{showCheck && isMet ? (
								<Check className="w-3 h-3 text-green-600 dark:text-green-400" />
							) : showCheck && !isMet ? (
								<X className="w-3 h-3 text-muted-foreground" />
							) : (
								<div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
							)}
						</div>
						<span className={clsx('text-xs', showCheck && isMet && 'font-medium')}>
							{requirement.label}
						</span>
					</div>
				);
			})}
			{confirmPassword !== undefined && (
				<div
					className={clsx(
						'flex items-center gap-2 transition-colors',
						showPasswordsMatch && passwordsMatch && 'text-green-600 dark:text-green-400',
						showPasswordsMatch && !passwordsMatch && 'text-muted-foreground',
						!showPasswordsMatch && 'text-muted-foreground'
					)}
				>
					<div
						className={clsx(
							'flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors',
							showPasswordsMatch && passwordsMatch && 'bg-green-600/20 dark:bg-green-400/20',
							showPasswordsMatch && !passwordsMatch && 'bg-muted',
							!showPasswordsMatch && 'bg-muted'
						)}
					>
						{showPasswordsMatch && passwordsMatch ? (
							<Check className="w-3 h-3 text-green-600 dark:text-green-400" />
						) : showPasswordsMatch && !passwordsMatch ? (
							<X className="w-3 h-3 text-muted-foreground" />
						) : (
							<div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
						)}
					</div>
					<span className={clsx('text-xs', showPasswordsMatch && passwordsMatch && 'font-medium')}>
						Passwords match
					</span>
				</div>
			)}
		</motion.div>
	);
}

export function validatePasswordRequirements(password: string): boolean {
	return requirements.every(req => req.test(password));
}
