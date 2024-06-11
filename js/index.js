const pitch = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const keyBoardMIDIList = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k']
const pressedKeyBoard = [false, false, false, false, false, false, false, false, false, false, false, false, false]

const trackInfos = {};

let thisTrackNum = 1;

function createTrackInfoNewOne(index) {

    const track = []

    for (let i = 0; i < 160; i++) track.push([])

    trackInfos[index] = track
}

let navigateAt = 0; // trackInfo 에 사용할 인덱스
let defaultNavigateAt = 0;

let navigateX = 136;
let defaultNavigateX = 136;

let scrollXDiffer = 0

let isPlaying = false;
let isIndexed = false;

let brushMode = false

let midiMode = false
let midiScale = 4;

const synth = new Tone.PolySynth(Tone.Synth).toDestination();

function playNote(note) {

    if (typeof note != "object" || note.length === 0) {
        return
    }

    let pitch

    if (Array.isArray(note)) {
        pitch = note.map(note => note.dataset.pitch)
    }else {
        pitch = note.dataset.pitch
    }

    synth.triggerAttackRelease(pitch, "8n")
}

function saveNote(note) {
    const thisArray = trackInfos[thisTrackNum][note.dataset.x]

    thisArray.push(note)

    note.classList.add('inserted')
}

function deleteNote(note) {
    const thisArray = trackInfos[thisTrackNum][note.dataset.x]

    thisArray.splice(thisArray.indexOf(note), 1)

    note.classList.remove('inserted')
}

function createNote(x, y, layerInfo) {
    const note = document.createElement('div')
    note.classList.add('note')
    const isWhiteNote = [0, 2, 4, 6, 7, 9, 11].includes(y % 12)

    note.classList.add(isWhiteNote ? 'white' : 'black')
    note.classList.add((x % 4 === 3) ? 'last' : 'normal')
    note.classList.add((y % 12 === 0) ? 'end' : 'nothing')

    note.dataset.pitch = `${pitch[(84 - y - 1) % 12] + (Math.floor((84 - y - 1) / 12) + 1)}`
    note.dataset.x = x

    if (Array.isArray(layerInfo) && layerInfo.filter((thisNote) => thisNote.dataset.pitch === note.dataset.pitch).length !== 0) {
        note.classList.add('inserted')
    }

    note.addEventListener('mousedown', () => {
        if (brushMode) {
            if (trackInfos[thisTrackNum][note.dataset.x].indexOf(note) === -1) {
                playNote(note)
                saveNote(note)
            }else {
                deleteNote(note)
            }
        }
    })

    note.addEventListener('dblclick', () => {
        if (!brushMode) {
            if (trackInfos[thisTrackNum][note.dataset.x].indexOf(note) === -1) {
                playNote(note)
                saveNote(note)
            }else {
                deleteNote(note)
            }
        }
    })
    return note
}

function createKeyNote(index, scale) {
    const keyNote = document.createElement('div')

    keyNote.classList.add(
        'key',
        ([0, 2, 4, 6, 7, 9, 11].includes(index)) ? 'white' : 'black',
        ([0, 7].includes(index)) ? 'side' : 'nothing'
    )

    keyNote.dataset.pitch = `${pitch[11 - index] + scale}`

    keyNote.addEventListener('mousedown', () => {
        playNote(keyNote)
        keyNote.classList.add('pushed')
    })
    keyNote.addEventListener('mouseup', () => {
        keyNote.classList.remove('pushed')
    })



    return keyNote
}

function createKeyboard(scale) {
    const keyboardBase = document.createElement("div")

    keyboardBase.classList.add('keyboard')

    const text = document.createElement("div")
    text.innerText = `C${scale}`
    text.classList.add("keyboardText")
    const notes = document.createElement("div")
    for (let i = 0; i < 12; i++) {
        notes.appendChild(createKeyNote(i, scale))
    }
    notes.classList.add("keyboardNotes")

    keyboardBase.appendChild(text)
    keyboardBase.appendChild(notes)

    return keyboardBase
}


let deleteLayerQueue = []
let layerCount = 1;
function createLayer(isSelected) {
    deleteLayerQueue.sort()

    const thisNumber = (deleteLayerQueue.length === 0) ? layerCount++ : deleteLayerQueue.shift()

    createTrackInfoNewOne(thisNumber)

    const layer = document.createElement("div")
    layer.classList.add('layer')
    layer.dataset.layer = thisNumber

    if (isSelected) layer.id = 'selectedLayer'

    const deleteButton = document.createElement("div")

    deleteButton.classList.add('deleteLayer')

    let isDisabled = false

    deleteButton.addEventListener('click', () => {
        if(layer.id !== 'selectedLayer') {
            layer.remove()
            delete trackInfos[layer.dataset.layer]
            deleteLayerQueue.push(layer.dataset.layer)
            isDisabled = true
        }
    })

    layer.appendChild(deleteButton)

    layer.addEventListener('click', () => {
        if (isDisabled) return

        const layerList = document.querySelectorAll(".layer")
        layerList.forEach((thisLayer) => {
            thisLayer.id = ""
        })
        layer.id = "selectedLayer"

        thisTrackNum = layer.dataset.layer

        rendering(layer)
    })

    const textBox = document.createElement('div')
    textBox.innerText = `트랙 ${thisNumber}`
    layer.appendChild(textBox)

    return layer
}

let playNavigateId;

function playNavigate() {
    const navigate = document.querySelector("#navigate")

    const noteWidth = document.querySelectorAll(".note")[0].offsetWidth
    navigateX += noteWidth / 10
    navigate.style.marginLeft = `${navigateX}px`
}

let playMusicId;

function playMusic() {
    Object.values(trackInfos).forEach((track) => {
        playNote(track[navigateAt])
    })
    navigateAt++
}

function stop() {
    clearInterval(playNavigateId)
    playNavigateId = null
    clearInterval(playMusicId)
    playMusicId = null

}

function bpmReset() {
    const bpm = document.querySelector("#bpmValue").value

    if (playNavigateId) {
        clearInterval(playNavigateId)

        playNavigateId = setInterval(playNavigate,
            60 / bpm * 10)
    }
}

function rendering(thisLayer) {
    const track = trackInfos[thisLayer.dataset.layer]

    const inTrack = document.querySelector("#inTrack")
    const base = document.querySelector("#base")

    const newBase = document.createElement("div")
    newBase.id = "base"

    inTrack.removeChild(base)

    inTrack.appendChild(newBase)

    for (let o = 0; o < 40; o++) {
        for (let k = 0; k < 4; k++) {
            const noteList = document.createElement('div')
            for (let i = 0; i < 7; i++)
                for (let j = 0; j < 12; j++)
                    if (thisLayer === "undefined") {
                        noteList.appendChild(createNote(k + o * 4, i * 12 + j))
                    }else {
                        noteList.appendChild(createNote(k + o * 4, i * 12 + j, track[k + o * 4]))
                    }

            noteList.classList.add('noteList')
            newBase.appendChild(noteList)
        }
    }
}

function offAllMIDI() {
    for (let s = 1; s <= 7; s++) {
        for (let i = 0; i < keyBoardMIDIList.length; i++) {
            if (pressedKeyBoard[i]) {
                let thisPitch = pitch[i % 12]
                thisPitch += (midiScale + Math.floor(i / 12)).toString()

                pressedKeyBoard[i] = false
                synth.triggerRelease(thisPitch)
            }
        }

    }
}

function toggleMode(mode) {
    console.log(mode)
    if (typeof mode === "string") mode = document.querySelector(`#${mode}`)
    console.log(mode)

    switch (mode.id) {
        case "brush":
            brushMode = !brushMode
            break
        case "midi":
            midiMode = !midiMode

            if (!midiMode) {
                offAllMIDI()
            }
            break
        default:
    }

    if (mode.classList.contains('on')) {
        mode.classList.remove('on')
    }else {
        mode.classList.add('on')
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 노트 양산 + 위치표 양산
    const base = document.querySelector("#base");
    const navigator = document.querySelector("#navigatorBar")
    const navigate = document.querySelector("#navigate")

    for (let o = 0; o < 40; o++) {
        for (let k = 0; k < 4; k++) {
            // 노트
            const noteList = document.createElement('div')
            for (let i = 0; i < 7; i++)
                for (let j = 0; j < 12; j++)
                    noteList.appendChild(createNote(k + o * 4, i * 12 + j))
            noteList.classList.add('noteList')
            base.appendChild(noteList)

            // 위치표
            const location = document.createElement("div")
            location.classList.add('location')
            if (k === 0) {
                const line = document.createElement("img")
                line.src = "../media/locationLine.svg"
                line.alt = "위치 라인"
                const text = document.createElement("div")
                text.innerText = o.toString()

                location.appendChild(line)
                location.appendChild(text)
            }

            location.dataset.loc = (k + o * 4).toString()
            navigator.appendChild(location)
        }
    }


    // X축과 Y축 따라오도록 설정
    const keyboards = document.querySelector("#keyboards")

    window.addEventListener('scroll', () => {
        keyboards.style.marginTop = `${-window.scrollY + 35}px`;
        navigator.style.marginLeft = `${-window.scrollX}px`;
        navigateX = scrollXDiffer - window.scrollX + navigateX
        navigate.style.marginLeft = `${navigateX}px`
        scrollXDiffer = window.scrollX
    })

    // 키보드 양산
    for (let i = 7; i >= 1; i--) {
        keyboards.appendChild(createKeyboard(i))
    }


    const layerList = document.querySelector("#layerList")

    // 기본 트랙(레이어) 생성
    layerList.appendChild(createLayer(true))

    // 트랙 추가 반응
    const addLayer = document.querySelector("#addLayer")
    addLayer.addEventListener('click', () => {
        layerList.appendChild(createLayer(false))
    })

    // bpm 오르락 내리락
    const bpmDown = document.querySelector("#bpmDown")
    const bpmUp = document.querySelector("#bpmUp")
    const bpm = document.querySelector("#bpmValue")

    bpm.addEventListener('blur', () => {
        if(isNaN(bpm.value) || bpm.value <= 0) {
            bpm.value = 120
        }
        bpmReset()
    })

    bpmDown.addEventListener("mousedown", () => {
        bpm.value = parseInt(bpm.value) - 1
        bpmReset()
    })

    bpmUp.addEventListener("mousedown", () => {
        bpm.value = parseInt(bpm.value) + 1
        bpmReset()
    })

    // 로케이션 인덱스화
    const locations = document.querySelectorAll(".location")

    locations.forEach((location) => {
        location.addEventListener('mousedown', () => {
            if (isPlaying) {
                stop()
                isPlaying = !isPlaying
            }

            navigateX = -window.scrollX + 136 + location.dataset.loc * 45
            defaultNavigateX = 136 + location.dataset.loc * 45
            navigate.style.marginLeft = `${navigateX}px`

            navigateAt = location.dataset.loc
            defaultNavigateAt = navigateAt
            isIndexed = true
        })
    })

    // MODE 온 오프 딸깍 딸깍
    const modes = document.querySelectorAll(".mode")

    modes.forEach((mode) => {
        mode.addEventListener('click', () => {
            toggleMode(mode)
        })
    })

    window.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            event.preventDefault()
            if (!isPlaying){
                if (!isIndexed) {
                    navigateAt = 0
                    navigateX = -scrollX + 136
                }else {
                    navigateX = -scrollX + defaultNavigateX
                    navigateAt = defaultNavigateAt
                }

                console.log("play")
                playNavigate()
                playNavigateId = setInterval(playNavigate, 60 / bpm.value * 25)
                playMusic()
                playMusicId = setInterval(playMusic, 60 / bpm.value * 250)
            }else {

                console.log("stop!")
                stop()
            }

            isPlaying = !isPlaying
        }

        if (event.key === 'Escape') {
            if (isPlaying) {
                stop()

                isPlaying = !isPlaying
            }
            if (isIndexed) isIndexed = false;

            navigateAt = 0

            navigate.style.marginLeft = `${- scrollX + 136}px`
            navigateX = -scrollX + 136
        }

        if (event.key === 'b') {
            toggleMode("brush")

            console.log(`brush mode ${(brushMode) ? "on" : "off"}`)
        }

        if (event.key === 'm') {
            toggleMode("midi")

            console.log(`midi mode ${(midiMode) ? "on" : "off"}`)
        }

        if (['<', ',', '>', '.'].includes(event.key)) {
            let idx = ['<', ',', '>', '.'].indexOf(event.key)

            offAllMIDI()

            if (idx < 3 && midiScale > 1) midiScale--
            else if (idx > 2 && midiScale < 7) midiScale++
        }

        if (keyBoardMIDIList.indexOf(event.key.toLowerCase()) !== -1 && midiMode) {
            const index = keyBoardMIDIList.indexOf(event.key.toLowerCase())

            if(!pressedKeyBoard[index]) {
                let thisPitch = pitch[index % 12]
                thisPitch += (midiScale + Math.floor(index / 12)).toString()

                synth.triggerAttack(thisPitch)
                pressedKeyBoard[index] = true
            }
        }
    })

    window.addEventListener('keyup', (event) => {
        if (keyBoardMIDIList.indexOf(event.key.toLowerCase()) !== -1 && midiMode) {
            const index = keyBoardMIDIList.indexOf(event.key.toLowerCase())

            if (pressedKeyBoard[index]) {
                let thisPitch = pitch[index % 12]
                thisPitch += (midiScale + Math.floor(index / 12)).toString()

                pressedKeyBoard[index] = false
                synth.triggerRelease(thisPitch)
            }
        }
    })

    alert("확대율을 80%로 설정하는 것을 추천합니다.")
})