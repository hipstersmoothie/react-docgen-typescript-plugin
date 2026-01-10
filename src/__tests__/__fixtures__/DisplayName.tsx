interface ButtonComponentProps {
  text: string;
}

export const Button = (props: ButtonComponentProps) => <button>{props.text}</button>;

Button.displayName = 'MyButtonDisplayName';
