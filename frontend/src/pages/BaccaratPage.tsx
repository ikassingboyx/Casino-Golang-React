interface Props { offline?: boolean }

export default function BaccaratPage({ offline = false }: Props) {
  return <div>BaccaratPage {offline ? '(offline)' : '(online)'}</div>
}
