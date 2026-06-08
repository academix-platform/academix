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
  const containsArabic = /[\u0600-\u06FF]/.test(children);
  const startIndex = highlightWord ? children.indexOf(highlightWord) : -1;
  const endIndex = startIndex !== -1 ? startIndex + highlightWord!.length : -1;
  const arabicParts = containsArabic ? children.split(/(\s+)/) : [];

  return (
    <h1 className={`${className} overflow-hidden`}>
      {containsArabic
        ? arabicParts.map((part, index) => {
            const isSpace = /^\s+$/.test(part);
            const isHighlighted =
              !!highlightWord && part.includes(highlightWord);

            return isSpace ? (
              <span key={index}> </span>
            ) : (
              <span
                key={index}
                className={`
                  inline-block translate-y-8 opacity-0
                  animate-[titleReveal_0.5s_ease-out_forwards]
                  ${isHighlighted ? highlightColor : ""}
                `}
                style={{
                  animationDelay: `${index * 90}ms`,
                }}
              >
                {part}
              </span>
            );
          })
        : children.split("").map((char, index) => {
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
