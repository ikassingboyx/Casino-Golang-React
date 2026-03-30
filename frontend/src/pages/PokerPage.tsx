interface Props { offline?: boolean }

export default function PokerPage({ offline = false }: Props) {
  return <div>PokerPage {offline ? '(offline)' : '(online)'}</div>
}
