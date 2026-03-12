import "Effects/Confetti.css";

export function confetti(refElement, options) {
	const rect = refElement.getBoundingClientRect();

	const { colors, sparkles, emoji, onAnimationDone } = {
		colors: ['#ff6b6b', '#4ecdc4', '#ffd93d', '#a29bfe', '#fd79a8', '#ff8787', '#54ebc4', '#feca57', '#48dbfb'],
		sparkles: ['✨', '⭐', '💫', '🌟', '💥', '✴️'],
		emoji: '😊',
		onAnimationDone: () => {},
		...options
	};

	const animationElement = document.createElement('div');
	animationElement.style.position = "absolute";
	animationElement.style.left = `${rect.left + window.pageXOffset }px`;
	animationElement.style.top = `${rect.top + window.pageYOffset }px`;
	animationElement.style.width = `${rect.width}px`;
	animationElement.style.height = `${rect.height}px`;
	animationElement.style.pointerEvents = "none";
	animationElement.style.zIndex = 10000;
	document.body.appendChild(animationElement);

	let remainingAnimations = 0;
	const handleAnimationEnd = () => {
		remainingAnimations--;
		if (remainingAnimations == 0) {
			animationElement.remove();
			onAnimationDone();
		}
	};

	for (let i = 0; i < 10; i++) {
		const confetti = document.createElement('div');
		confetti.className = 'confetti confetti--type-piece';
		confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

		const angle = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
		const distance = 45 + Math.random() * 25;
		const x = Math.cos(angle) * distance;
		const y = Math.sin(angle) * distance;

		confetti.style.setProperty('--x', x + 'px');
		confetti.style.setProperty('--y', y + 'px');
		confetti.style.left = '50%';
		confetti.style.top = '50%';
		confetti.style.animationDelay = Math.random() * 0.05 + 's';
		confetti.onanimationend = handleAnimationEnd;
		animationElement.appendChild(confetti);
		remainingAnimations++;
	}

	for (let i = 0; i < 3; i++) {
		const sparkle = document.createElement('div');
		sparkle.className = 'confetti confetti--type-sparkle';
		sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

		const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
		const distance = 38 + Math.random() * 12;
		const x = Math.cos(angle) * distance;
		const y = Math.sin(angle) * distance;

		sparkle.style.setProperty('--x', x + 'px');
		sparkle.style.setProperty('--y', y + 'px');
		sparkle.style.left = '50%';
		sparkle.style.top = '50%';
		sparkle.style.animationDelay = (i * 0.03) + 's';
		sparkle.onanimationend = handleAnimationEnd;
		animationElement.appendChild(sparkle);
		remainingAnimations++;
	}

	const floatingEmoji = document.createElement('div');
	floatingEmoji.className = 'confetti confetti--type-emoji';
	floatingEmoji.textContent = emoji;
	floatingEmoji.onanimationend = handleAnimationEnd;
	animationElement.appendChild(floatingEmoji);
	remainingAnimations++;
}
