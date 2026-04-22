import useTheme from '../hooks/useTheme';

export default function ThemeToggle() {
  const { isLight, toggle } = useTheme();

  return (
    <button
      className="theme-toggle-fab"
      onClick={toggle}
      title={isLight ? 'Donker thema' : 'Licht thema'}
    >
      {isLight ? '\u263D' : '\u2600'}
    </button>
  );
}
