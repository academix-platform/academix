interface AnimatedTitleProps {
  children: string;
  className?: string;
  highlightColor?: string;
  highlightWord?: string;
}

const AnimatedTitle = ({
  children,
  className = "",
  highlightColor = "text-academixPurple",
  highlightWord,
}: AnimatedTitleProps) => {
  const startIndex = highlightWord ? children.indexOf(highlightWord) : -1;
  const endIndex = startIndex !== -1 ? startIndex + highlightWord!.length : -1;

  return (
    <h1 className={`${className} overflow-hidden`}>
      {children.split("").map((char, index) => {
        const isHighlighted = index >= startIndex && index < endIndex;

        return (
          <span
            key={index}
            className={`
              inline-block translate-y-8 opacity-0
              animate-[titleReveal_0.5s_ease-out_forwards]
              ${isHighlighted ? highlightColor : ""}
            `}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </h1>
  );
};

export default AnimatedTitle;
