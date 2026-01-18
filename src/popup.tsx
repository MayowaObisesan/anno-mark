import { Button, Flex, Text, Theme } from "@radix-ui/themes";
import { useState } from "react"
import './globals.css'

function IndexPopup() {
  const [data, setData] = useState("")

  return (
    <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: 16,
          width: 360,
        }}>
        <Flex direction="column" gap="2">
          <Text>Hello from Radix Themes :)</Text>
          <Button>Let's go</Button>
        </Flex>
        <input onChange={(e) => setData(e.target.value)} value={data} />
        <footer>Crafted by @PlasmoHQ</footer>
      </div>
    </Theme>
  )
}

export default IndexPopup
