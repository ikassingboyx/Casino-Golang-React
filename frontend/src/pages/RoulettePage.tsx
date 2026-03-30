interface Props { offline?: boolean }

export default function RoulettePage({ offline = false }: Props) {
  return <div>RoulettePage {offline ? '(offline)' : '(online)'}</div>
}
