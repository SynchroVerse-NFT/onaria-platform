import { useState } from 'react';
import { LucideNetwork, ChevronRight, File } from 'lucide-react';
import type { FileType } from '../hooks/use-chat';
import clsx from 'clsx';

interface FileTreeItem {
	name: string;
	type: 'file' | 'folder';
	filePath: string;
	children?: { [key: string]: FileTreeItem };
	file?: FileType;
}

export function FileTreeItem({
	item,
	level = 0,
	currentFile,
	onFileClick,
}: {
	item: FileTreeItem;
	level?: number;
	currentFile: FileType | undefined;
	onFileClick: (file: FileType) => void;
}) {
	const [isExpanded, setIsExpanded] = useState(true);
	const isCurrentFile = currentFile?.filePath === item.filePath;

	if (item.type === 'file' && item.file) {
		return (
			<button
				onClick={() => onFileClick(item.file!)}
				className={clsx(
					'flex items-center w-full gap-2 py-1.5 px-3 transition-all duration-200 text-sm rounded-md mx-1 group',
					isCurrentFile
						? 'bg-gradient-to-r from-cosmic-blue/20 to-cosmic-purple/20 text-cosmic-purple border border-cosmic-purple/30 shadow-sm'
						: 'text-text-primary/80 hover:bg-gradient-to-r hover:from-cosmic-blue/10 hover:to-cosmic-purple/10 hover:text-text-primary hover:border hover:border-cosmic-blue/20'
				)}
				style={{ paddingLeft: `${level * 12 + 12}px` }}
			>
				<File className={clsx(
					'size-3 transition-colors',
					isCurrentFile ? 'text-cosmic-purple' : 'text-text-primary/60 group-hover:text-cosmic-blue'
				)} />
				<span className="flex-1 text-left truncate">{item.name}</span>
				{/* {item.file.isGenerating ? (
					<Loader className="size-3 animate-spin" />
				) : null}
				{item.file.needsFixing && (
					<span className="text-[9px] text-orange-400">fix</span>
				)}
				{item.file.hasRuntimeError && (
					<span className="text-[9px] text-red-400">error</span>
				)} */}
			</button>
		);
	}

	return (
		<div>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-2 py-1.5 px-3 transition-all duration-200 text-sm text-text-primary/80 hover:bg-gradient-to-r hover:from-cosmic-blue/5 hover:to-cosmic-purple/5 hover:text-text-primary w-full rounded-md mx-1 group"
				style={{ paddingLeft: `${level * 12 + 12}px` }}
			>
				<ChevronRight
					className={clsx(
						'size-3 transition-all duration-200 ease-in-out text-text-primary/60 group-hover:text-cosmic-blue',
						isExpanded && 'rotate-90',
					)}
				/>
				<span className="flex-1 text-left truncate">{item.name}</span>
			</button>
			{isExpanded && item.children && (
				<div>
					{Object.values(item.children).map((child) => (
						<FileTreeItem
							key={child.filePath}
							item={child}
							level={level + 1}
							currentFile={currentFile}
							onFileClick={onFileClick}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function buildFileTree(files: FileType[]): FileTreeItem[] {
	const root: { [key: string]: FileTreeItem } = {};

	files.forEach((file) => {
		const parts = file.filePath.split('/');
		let currentLevel: { [key: string]: FileTreeItem } = root;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (!currentLevel[part]) {
				currentLevel[part] = {
					name: part,
					type: 'folder',
					filePath: parts.slice(0, i + 1).join('/'),
					children: {},
				};
			}
			if (!currentLevel[part].children) {
				currentLevel[part].children = {};
			}
			currentLevel = currentLevel[part].children;
		}

		const fileName = parts[parts.length - 1];
		currentLevel[fileName] = {
			name: fileName,
			type: 'file',
			filePath: file.filePath,
			file: file,
		};
	});

	return Object.values(root);
}

export function FileExplorer({
	files,
	bootstrapFiles,
	currentFile,
	onFileClick,
}: {
	files: FileType[];
	bootstrapFiles: FileType[];
	currentFile: FileType | undefined;
	onFileClick: (file: FileType) => void;
}) {
	const fileTree = buildFileTree([...bootstrapFiles, ...files]);

	return (
		<div className="w-full max-w-[200px] bg-bg-3/95 backdrop-blur-md border-r border-cosmic-blue/20 h-full overflow-y-auto shadow-[inset_0_0_20px_rgba(100,181,246,0.03)]">
			<div className="p-2 px-3 text-sm flex items-center gap-2 text-text-primary/70 font-medium bg-gradient-to-r from-cosmic-blue/5 to-cosmic-purple/5 border-b border-cosmic-blue/10">
				<LucideNetwork className="size-4 text-cosmic-blue" />
				<span className="bg-gradient-to-r from-cosmic-blue to-cosmic-purple bg-clip-text text-transparent font-semibold">
					Files
				</span>
			</div>
			<div className="flex flex-col py-2">
				{fileTree.map((item) => (
					<FileTreeItem
						key={item.filePath}
						item={item}
						currentFile={currentFile}
						onFileClick={onFileClick}
					/>
				))}
			</div>
		</div>
	);
}
