import type { BlueprintType } from '@/api-types';
import clsx from 'clsx';
import { Markdown } from './messages';

export function Blueprint({
	blueprint,
	className,
	...props
}: React.ComponentProps<'div'> & {
	blueprint: BlueprintType;
}) {
	if (!blueprint) return null;

	return (
		<div className={clsx('w-full flex flex-col', className)} {...props}>
			<div className="bg-accent dark:bg-gradient-to-r dark:from-[#0d0e1f] dark:via-[#1a1b2e] dark:to-[#0d0e1f] p-6 rounded-t-xl flex items-center bg-graph-paper border-b border-transparent dark:border-[#64b5f6]/20">
				<div className="flex flex-col gap-1">
					<div className="uppercase text-xs tracking-wider text-text-on-brand/90 dark:text-[#64b5f6]/70">
						Blueprint
					</div>
					<div className="text-2xl font-medium text-text-on-brand dark:text-[#64b5f6]">
						{blueprint.title}
					</div>
				</div>
			</div>
			<div className="flex flex-col px-6 py-4 bg-bg-2 dark:bg-gradient-to-br dark:from-[#0a0b1a]/80 dark:via-[#0d0e1f]/60 dark:to-[#0a0b1a]/80 dark:backdrop-blur-sm rounded-b-xl space-y-8 dark:border dark:border-[#64b5f6]/10">
				{/* Basic Info */}
				<div className="grid grid-cols-[120px_1fr] gap-4 text-sm">
					<div className="text-text-50/70 dark:text-[#64b5f6]/60 font-mono">Description</div>
					<Markdown className="text-text-50 dark:text-gray-300">{blueprint.description}</Markdown>

					{Array.isArray(blueprint.colorPalette) &&
						blueprint.colorPalette.length > 0 && (
							<>
								<div className="text-text-50/70 dark:text-[#64b5f6]/60 font-mono">Color Palette</div>
								<div className="flex items-center gap-2">
									{Array.isArray(blueprint.colorPalette) &&
										blueprint.colorPalette?.map((color, index) => (
											<div
												key={`color-${index}`}
												className="size-6 rounded-md border border-text/10 flex items-center justify-center"
												style={{ backgroundColor: color }}
												title={color}
											>
												<span className="sr-only">{color}</span>
											</div>
										))}
								</div>{' '}
							</>
						)}

					<div className="text-text-50/70 dark:text-[#64b5f6]/60 font-mono">Dependencies</div>
					<div className="flex flex-wrap gap-2 items-center">
						{Array.isArray(blueprint.frameworks) &&
							blueprint.frameworks.map((framework, index) => {
								let name: string, version: string | undefined;

								// support scoped packages
								if (framework.startsWith('@')) {
									const secondAt = framework.lastIndexOf('@');
									if (secondAt === 0) {
										name = framework;
									} else {
										name = framework.slice(0, secondAt);
										version = framework.slice(secondAt + 1);
									}
								} else {
									[name, version] = framework.split('@');
								}

								return (
									<span
										key={`framework-${framework}-${index}`}
										className="flex items-center text-xs border border-text/20 dark:border-[#64b5f6]/30 dark:bg-[#1a1b2e]/40 rounded-full px-2 py-0.5 text-text-primary/90 dark:text-gray-300 hover:border-white/40 dark:hover:border-[#64b5f6]/50 transition-colors"
									>
										<span className="font-medium">{name}</span>
										{version && (
											<span className="text-text-primary/50">@{version}</span>
										)}
									</span>
								);
							})}
					</div>
				</div>

				{/* Views */}
				{Array.isArray(blueprint.views) && blueprint.views.length > 0 && (
					<div>
						<h3 className="text-sm font-medium mb-3 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							Views
						</h3>
						<div className="space-y-3">
							{blueprint.views.map((view, index) => (
								<div key={`view-${index}`} className="space-y-1 dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
									<h4 className="text-xs font-medium text-text-50/70 dark:text-[#64b5f6]/80">
										{view.name}
									</h4>
									<Markdown className="text-sm text-text-50 dark:text-gray-300">
										{view.description}
									</Markdown>
								</div>
							))}
						</div>
					</div>
				)}

				{/* User Flow */}
				{blueprint.userFlow && (
					<div>
						<h3 className="text-sm font-medium mb-3 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							User Flow
						</h3>
						<div className="space-y-4">
							{blueprint.userFlow?.uiLayout && (
								<div className="dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
									<h4 className="text-xs font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/80">
										UI Layout
									</h4>
									<Markdown className="text-sm text-text-50 dark:text-gray-300">
										{blueprint.userFlow.uiLayout}
									</Markdown>
								</div>
							)}

							{blueprint.userFlow?.uiDesign && (
								<div className="dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
									<h4 className="text-xs font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/80">
										UI Design
									</h4>
									<Markdown className="text-sm text-text-50 dark:text-gray-300">
										{blueprint.userFlow.uiDesign}
									</Markdown>
								</div>
							)}

							{blueprint.userFlow?.userJourney && (
								<div className="dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
									<h4 className="text-xs font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/80">
										User Journey
									</h4>
									<Markdown className="text-sm text-text-50 dark:text-gray-300">
										{blueprint.userFlow?.userJourney}
									</Markdown>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Data Flow */}
				{(blueprint.dataFlow || blueprint.architecture?.dataFlow) && (
					<div>
						<h3 className="text-sm font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							Data Flow
						</h3>
						<Markdown className="text-sm text-text-50 dark:text-gray-300 dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
							{blueprint.dataFlow || blueprint.architecture?.dataFlow}
						</Markdown>
					</div>
				)}

				{/* Implementation Roadmap */}
				{Array.isArray(blueprint.implementationRoadmap) && blueprint.implementationRoadmap.length > 0 && (
					<div>
						<h3 className="text-sm font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							Implementation Roadmap
						</h3>
						<div className="space-y-3">
							{blueprint.implementationRoadmap.map((roadmapItem, index) => (
								<div key={`roadmap-${index}`} className="space-y-1 dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
									<h4 className="text-xs font-medium text-text-50/70 dark:text-[#64b5f6]/80">
										Phase {index + 1}: {roadmapItem.phase}
									</h4>
									<Markdown className="text-sm text-text-50 dark:text-gray-300">
										{roadmapItem.description}
									</Markdown>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Initial Phase */}
				{blueprint.initialPhase && (
					<div>
						<h3 className="text-sm font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							Initial Phase
						</h3>
						<div className="space-y-3">
							<div className="dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
								<h4 className="text-xs font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/80">
									{blueprint.initialPhase.name}
								</h4>
								<Markdown className="text-sm text-text-50 dark:text-gray-300 mb-3">
									{blueprint.initialPhase.description}
								</Markdown>
								{Array.isArray(blueprint.initialPhase.files) && blueprint.initialPhase.files.length > 0 && (
									<div>
										<h5 className="text-xs font-medium mb-2 text-text-50/60 dark:text-[#64b5f6]/70">
											Files to be created:
										</h5>
										<div className="space-y-2">
											{blueprint.initialPhase.files.map((file, fileIndex) => (
												<div key={`initial-phase-file-${fileIndex}`} className="border-l-2 border-text/10 dark:border-[#64b5f6]/30 pl-3">
													<div className="font-mono text-xs text-text-50/80 dark:text-gray-300">{file.path}</div>
													<div className="text-xs text-text-50/60 dark:text-gray-400">{file.purpose}</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{/* Pitfalls */}
				{Array.isArray(blueprint.pitfalls) && blueprint.pitfalls.length > 0 && (
					<div>
						<h3 className="text-sm font-medium mb-2 text-text-50/70 dark:text-[#64b5f6]/70 uppercase tracking-wider">
							Pitfalls
						</h3>
						<div className="prose prose-sm prose-invert dark:bg-[#1a1b2e]/30 dark:border dark:border-[#64b5f6]/10 dark:rounded-lg dark:p-3">
							<ul className="dark:text-gray-300">
								{blueprint.pitfalls?.map((pitfall, index) => (
									<li key={`pitfall-${index}`} className="">
										{pitfall}
									</li>
								))}
							</ul>
						</div>
					</div>
				)}


			</div>
		</div>
	);
}
