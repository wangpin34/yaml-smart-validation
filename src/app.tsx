import { useState, useMemo } from 'preact/hooks'
import './app.css'
import yaml from 'js-yaml'
import schema from './schema.json'
import Ajv, { ErrorObject } from 'ajv'

const ajv = new Ajv()

const yamlStr = `
# this is comments
name: aa
version: 10
tags:
  - 123
  - 123
private: 
  age: 1
`

interface Line {
  text: string
  number: number
}

let position = 0
let lineNo = 0
let end = false
let maxLen = yamlStr.length

function readLine() {
  if (position >= maxLen) {
    return null
  }
  let buffer = [] as string[]
  let char = ''
  do {
    char = yamlStr.charAt(position)
    if(char !== '\n') {
      buffer.push(char)
    }
    position++
  } while(char !== `\n` && position < maxLen)
  return {
    text: buffer.join(''),
    number: lineNo++
  }  
}

const commentStr = /$#[\w\W]*/


function getLineErrors(errors: ErrorObject[]) {
  let line: Line | null = null
  const lines: Line[] = []
  while((line = readLine()) !== null) {
    console.log(`${line?.number} # ${line?.text}`)
    // ignore comments and empty line
    if (line.text.length > 0 && !commentStr.test(line.text)) {
      lines.push(line)
    }
  }

  if (lines.length < 1 ) {
    return []
  }
  let lineNo = 0
  let msg: any[] = []
  find_line: for(const error of errors) {
    const lineError = {
      error,
      lineNumber: 0,
      lineText: ''
    }
    msg.push(lineError)
    const path = error.instancePath
    console.log(`Searching instance [${path}]`)
    const slug = path.split('/').filter((v) => !!v)
    let slugPos = 0
    find_slug: while(slugPos < slug.length) {
      const key = slug[slugPos]
      console.log(`Searching [key=${key}]`)
      while(lineNo < lines.length) {
        const line = lines[lineNo++]
        const regExp = new RegExp(`\\s{${slugPos * 2}}${key}:\\s`)
        if (!regExp.test(line.text)) {
          if (slugPos > 0) {
            continue find_line 
          }
        } else {
          lineError.lineNumber = line.number
          lineError.lineText = line.text
          slugPos++
          continue find_slug
        }
      }
    }
  }

  return msg
}

export function App() {
  console.log(schema)
  const validate = useMemo(() => ajv.compile(schema), [])
  const msg = useMemo(() => {
    const yamlObj = yaml.load(yamlStr)
    const valid = validate(yamlObj)
    if (!valid) {
      const errors = validate.errors
    
      if (errors){
        const lineErrors = getLineErrors(errors)
        console.log(`lineErrors`)
        console.log(lineErrors)
      }
    }
    return !valid ? validate.errors : null
  } , [])
  return (
    <div>
      <div>
        <pre>
          <code>
          {JSON.stringify(msg, null, 2)}
          </code>
        </pre>
      </div>
    </div>
  )
}
