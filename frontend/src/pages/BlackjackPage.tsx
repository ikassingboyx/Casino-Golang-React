interface Props { offline?: boolean }

export default function BlackjackPage({ offline = false }: Props) {
  return <div>BlackjackPage {offline ? '(offline)' : '(online)'}</div>
}
