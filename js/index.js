const pitch = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const keyBoardMIDIList = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j', 'k', 'o', 'l', 'p']
const pressedKeyBoard = [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]

const trackInfos = {};

let trackOneBlockSize = 4;
let trackLongSize = 40;
let thisTrackNum = 1;

function createTrackInfoNewOne(index) {

    const track = []

    for (let i = 0; i < trackOneBlockSize * trackLongSize + 1; i++) track.push([])

    trackInfos[index] = track
}

function overwriteAllTrackBySize() {

    aliveLayer.forEach((trackNum) => {

        const track = trackInfos[trackNum]

        const newTrackSize = trackOneBlockSize * trackLongSize + 1

        if (track.length < newTrackSize) {
            const diff = newTrackSize - track.length
            for (let i = 0; i < diff; i++) track.push([])
        }else if(track.length > newTrackSize) {
            const pitchActive = []
            for (let i = newTrackSize; i < track.length; i++) {
                for (const node of track[i]) {
                    if (node.status === "disable" && pitchActive[parsePitch(node.pitch)] === undefined) {
                        pitchActive[parsePitch(node.pitch)] = true;
                    }
                    if (node.status === "enable") {
                        pitchActive[parsePitch(node.pitch)] = false;
                    }
                }
            }

            const addList = []
            pitchActive.forEach((value, index) => {
                if (value) {
                    addList.push(
                        Note(
                            getPitch(index),
                            newTrackSize - 1,
                            trackNum,
                            false
                        )
                    )
                }
            })


            track[newTrackSize - 1].push(...addList)
            track.splice(newTrackSize, track.length - newTrackSize)
        }
    })
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

let chordMode = false;
let chordInfo = {};

const defaultChord = { // default : M
    scale: '',
    m: 'M',
    additional: '',
    notes: [0, 4, 7]
}
// scale : 음정. 빈 문자열이라면 m, M7, dim 이런 꼬라지 라는 뜻

// m : 메이저 오알 마이너. notes 보고 구분하긴 힘들어서

// additional : 추가 화음. 위와 같은 이유로 여따가 같이 적음

// notes : 값들은 배열로. 0, 1, 2, 3, 4, 5, 6, ... 12 와 같이 됨

// 예 :
// {
//     scale: "C",
//     m: 'm',
//     additional: '7',
//     notes: [0, 3, 7, 10] (m7 코드)
// }
const synth = new Tone.PolySynth(Tone.Synth).toDestination();

function getPitch(y) {
    return `${pitch[(84 - y - 1) % 12] + (Math.floor((84 - y - 1) / 12) + 1)}`
}

function parsePitch(pit) {
    const scale = pit.slice(-1)
    pit = pit.slice(0, -1)

    return 84 - ((scale - 1) * 12 + pitch.indexOf(pit) + 1)
}

function Note(pitch, x, layer, status) {
    if(typeof x !== "number") {
        x = Number(x)
    }
    if(typeof layer !== "number") {
        layer = Number(layer)
    }
    return {
        pitch: pitch,
        x: x,
        layer: layer,
        status: (typeof status === "string") ? status : (status) ? 'enable' : 'disable'

    }
}

function playNote(notes) {

    if (typeof notes === "object") {
        const className = notes.constructor.name

        if (className === 'Array' && notes.length === 0) {
            return
        }

        if (className === 'HTMLDivElement') {
            synth.triggerAttackRelease(notes.dataset.pitch, 0.25)
        }else {
            for (const note of notes) {
                if (note.status === 'enable') {
                    synth.triggerAttack(note.pitch)
                }else { // disable
                    synth.triggerRelease(note.pitch)
                }
            }
        }
    }
}

function stopSound(pitch) {
    synth.triggerRelease(pitch)
}

function saveNote(note) {
    const thisTrack = trackInfos[thisTrackNum]

    const x = Number(note.dataset.x)

    thisTrack[x].push(
        Note(
            note.dataset.pitch,
            x,
            thisTrackNum,
            true
        )
    )
    thisTrack[x + 1].push(
        Note(
            note.dataset.pitch,
            x + 1,
            thisTrackNum,
            false
        )
    )

    note.classList.add('inserted')
    note.setAttribute("draggable", "true")
}

function deleteNote(note) {
    const thisTrack = trackInfos[thisTrackNum]

    const x = Number(note.dataset.x)

    thisTrack[x].splice(thisTrack[x].indexOf(
        Note(
            note.dataset.pitch,
            x,
            thisTrackNum,
            true
        )
    ), 1)

    thisTrack[x + 1].splice(thisTrack[x + 1].indexOf(
        Note(
            note.dataset.pitch,
            x + 1,
            thisTrackNum,
            false
        )
    ), 1)

    note.classList.remove('inserted')
    note.setAttribute("draggable", "false")
}

function deleteLongNote(note) {

    const origins = getLongNotesOrigins(note.dataset.x, note.dataset.pitch)

    for (let i = Number(origins[0]); i <= Number(origins[1]); i++) {
        const clearNote = document.querySelector(`[data-x="${i}"][data-pitch="${note.dataset.pitch}"]`)

        clearNote.classList.remove('inserted', 'start', 'end', 'long')
        clearNote.setAttribute('draggable', 'false')
    }

    const thisTrack = trackInfos[thisTrackNum]

    const frontParsedTrack = []
    for (const value of thisTrack[origins[0]]) {
        frontParsedTrack.push(JSON.stringify(value))
    }
    const backParsedTrack = []
    for (const value of thisTrack[origins[1] + 1]) {
        backParsedTrack.push(JSON.stringify(value))
    }

    thisTrack[origins[0]].splice(frontParsedTrack.indexOf(
        JSON.stringify(
            Note(
                note.dataset.pitch,
                origins[0],
                thisTrackNum,
                true
            )
        )
    ), 1)

    thisTrack[origins[1] + 1].splice(backParsedTrack.indexOf(
        JSON.stringify(
            Note(
                note.dataset.pitch,
                origins[1] + 1,
                thisTrackNum,
                false
            )
        )
    ), 1)

    stopSound(note.dataset.pitch)
}

function getLongNotesOrigins(domainIdx, domainPitch) {
    let originStart = Number(domainIdx)
    for (let i = Number(domainIdx); i >= 0; i--) {
        const thisNote = document.querySelector(`[data-x="${i}"][data-pitch="${domainPitch}"]`)
        if (thisNote.classList.contains('start')) {
            originStart = i;
            break;
        }else if (!thisNote.classList.contains('long')) {
            break;
        }
    }


    let originEnd = Number(domainIdx)
    for (let i = Number(domainIdx); i < trackOneBlockSize * trackLongSize; i++) {
        const thisNote = document.querySelector(`[data-x="${i}"][data-pitch="${domainPitch}"]`)
        if (thisNote.classList.contains('end')) {
            originEnd = i;
            break;
        }else if (!thisNote.classList.contains('long')) {
            break;
        }
    }

    return [originStart, originEnd]
}

let startIdx, endIdx, dragPitch

let isContinued = []

let onMousePitch
let onMouseX
let chordModeIsOK = true

function createNote(x, y) {
    const note = document.createElement('div')
    note.classList.add('note')
    const isWhiteNote = [0, 2, 4, 6, 7, 9, 11].includes(y % 12)

    note.classList.add(isWhiteNote ? 'white' : 'black')
    note.classList.add((x % trackOneBlockSize === trackOneBlockSize - 1) ? 'bar-last' : 'normal')
    note.classList.add((y % 12 === 0) ? 'top-end' : 'nothing')

    note.dataset.pitch = getPitch(y)
    note.dataset.x = x

    const thisLayer = trackInfos[thisTrackNum]

    const parsedLayer = JSON.stringify(thisLayer[x])
    const parsedNextLayer = JSON.stringify(thisLayer[x + 1])

    if (parsedLayer.includes(
        JSON.stringify(
            Note(
                note.dataset.pitch,
                x,
                thisTrackNum,
                true
            )
        )
    )) {
        if(parsedNextLayer.includes(
            JSON.stringify(
                Note(
                    note.dataset.pitch,
                    x + 1,
                    thisTrackNum,
                    false
                )
            )
        )) {
            note.classList.add('inserted')
        }else {
            note.classList.add('start')
            isContinued[y] = true
        }
    }

    if (x === trackOneBlockSize * trackLongSize - 1 ||parsedLayer.includes(
        JSON.stringify(
            Note(
                note.dataset.pitch,
                x,
                thisTrackNum,
                false
            )
        )
    )) {
        const beforeNote = document.querySelector(`[data-x="${x - 1}"][data-pitch="${note.dataset.pitch}"]`)

        if (isContinued) {
            beforeNote.classList.add('end')
            isContinued[y] = false
        }

        beforeNote.setAttribute('draggable', 'true')
    }

    if (isContinued[y]) {
        note.classList.add('inserted', 'long')
    }

    note.addEventListener('mouseenter', () => {
        onMousePitch = note.dataset.pitch
        onMouseX = x
        if (chordMode) {
            if (chordModeIsOK) renderChord()
        }
    })

    note.addEventListener('mousedown', () => {
        if (brushMode && !chordMode) {
            if (!note.classList.contains('inserted')) {
                playNote(note)
                saveNote(note)
            }else {
                if (note.classList.contains('long')) deleteLongNote(note)
                else deleteNote(note)
            }
        }
    })

    note.addEventListener('dblclick', () => {
        if (!brushMode && !chordMode) {
            if (!note.classList.contains('inserted')) {
                playNote(note)
                saveNote(note)
            }else {
                if (note.classList.contains('long')) deleteLongNote(note)
                else deleteNote(note)
            }
        }
    })

    note.addEventListener('dragend', () => {
        // + 보여주는 범위 없애기

        let origins = getLongNotesOrigins(startIdx, dragPitch)

        if (!note.classList.contains('inserted')) return
        if (note.classList.contains('long') && !note.classList.contains('end')) return

        if (endIdx - startIdx > 0) { // 앞으로 늘어난 경우
            let nextLongIdx = startIdx
            for (let i = Number(startIdx) + 1; i < trackOneBlockSize * trackLongSize + 1; i++) {
                if(i === trackOneBlockSize * trackLongSize) {
                    nextLongIdx = i;
                    break;
                }

                const thisNote = document.querySelector(`[data-x="${i}"][data-pitch="${dragPitch}"]`)
                nextLongIdx = i;
                if (thisNote.classList.contains('inserted')) break;
            }

            const setEnd = Math.min(Number(endIdx), Number(nextLongIdx - 1))

            for (let i = Number(startIdx); i <= setEnd; i++) {
                const note = document.querySelector(`[data-x="${i}"][data-pitch="${dragPitch}"]`)


                if (!note.classList.contains('inserted')) note.classList.add('inserted')
                note.classList.add('long')
                note.setAttribute('draggable', 'false')

                if (i == startIdx) {
                    if (startIdx != origins[0]) { // 이미 긴 노트를 연장 시킬 경우
                        note.classList.remove('end')
                    }else {
                        note.classList.add('start')
                    }
                }

                if (!note.classList.contains('start') && i == setEnd) {
                    note.setAttribute('draggable', 'true')
                    note.classList.add('end')
                }
            }

            // 트랙 내용 변경
            const deleteArray = trackInfos[thisTrackNum][origins[1] + 1]
            deleteArray.splice(deleteArray.indexOf(
                Note(
                    dragPitch,
                    origins[1],
                    thisTrackNum,
                    false
                )
            ), 1)

            const addArray = trackInfos[thisTrackNum][setEnd + 1]
            addArray.push({
                pitch: dragPitch,
                x: setEnd + 1,
                layer: thisTrackNum,
                status: 'disable'
            })
        }else { // 뒤로 늘어날 경우
            if (origins[0] == startIdx) return; // 단일 노드일경우

            const setEnd = Math.max(Number(endIdx), Number(origins[0]))
            for (let i = setEnd + 1; i <= startIdx; i++) {
                const note = document.querySelector(`[data-x="${i}"][data-pitch="${dragPitch}"]`)
                note.classList.remove('inserted', 'long', 'end')
                note.setAttribute('draggable', 'false')
            }

            const firstNote = document.querySelector(`[data-x="${setEnd}"][data-pitch="${dragPitch}"]`)
            if (setEnd == origins[0]) {
                firstNote.classList.remove('long', 'start')
            }else {
                firstNote.classList.add('end')
            }
            firstNote.setAttribute('draggable', 'true')

            // 트랙 내용 변경
            const deleteArray = trackInfos[thisTrackNum][origins[1] + 1]
            deleteArray.splice(deleteArray.indexOf(
                Note(
                    dragPitch,
                    origins[1] + 1,
                    thisTrackNum,
                    false
                )
            ), 1)

            const addArray = trackInfos[thisTrackNum][setEnd + 1]
            addArray.push(
                Note(
                    dragPitch,
                    setEnd + 1,
                    thisTrackNum,
                    false
                )
            )
        }
    })
    note.addEventListener('dragstart', () => {
        startIdx = note.dataset.x
        dragPitch = note.dataset.pitch
    })
    note.addEventListener('dragenter', () => {

        // TODO : 예상 노트길이 보여주기
        endIdx = note.dataset.x
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

    keyNote.dataset.pitch = getPitch(83 - ((scale - 1) * 12 + 11 - index))

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


const deleteLayerQueue = []
let aliveLayer = []
let layerCount = 1;
function createLayer(index) {
    deleteLayerQueue.sort()

    const thisNumber = (index) ? index : (deleteLayerQueue.length === 0) ? layerCount++ : deleteLayerQueue.shift()

    if (!index) {
        aliveLayer.push(thisNumber)
    }

    createTrackInfoNewOne(thisNumber)

    const layer = document.createElement("div")
    layer.classList.add('layer')
    layer.dataset.layer = thisNumber

    if (aliveLayer.length === 1 || thisNumber === thisTrackNum) layer.id = 'selectedLayer'

    const deleteButton = document.createElement("div")

    deleteButton.classList.add('deleteLayer')

    let isDisabled = false

    deleteButton.addEventListener('click', () => {
        if(layer.id !== 'selectedLayer') {
            const numValue = Number(layer.dataset.layer)
            layer.remove()
            delete trackInfos[numValue]
            deleteLayerQueue.push(numValue)
            aliveLayer.splice(aliveLayer.indexOf(numValue), 1)
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

        thisTrackNum = Number(layer.dataset.layer)

        rendering()
    })

    const textBox = document.createElement('div')
    textBox.innerText = `트랙 ${thisNumber}`
    layer.appendChild(textBox)

    return layer
}

let playNavigateId;

function playNavigate(bpm) {
    const navigate = document.querySelector("#navigate")

    const noteWidth = document.querySelectorAll(".note")[0].offsetWidth

    navigateX += noteWidth * trackOneBlockSize * (bpm / 60) / 100
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

    Tone.getTransport().bpm.rampTo(bpm, 0.001)

    if (playNavigateId) {
        clearInterval(playNavigateId)

        playNavigateId = setInterval(() => playNavigate(bpm), 10)
    }
}

function rendering() {
    const track = trackInfos[thisTrackNum]

    const base = document.querySelector("#base")
    const navigator = document.querySelector("#navigatorBar")

    const navigate = document.querySelector("#navigate")

    base.innerHTML = ''
    navigator.innerHTML = ''

    isContinued = []

    for (let o = 0; o < trackLongSize; o++) {
        for (let k = 0; k < trackOneBlockSize; k++) {
            const noteList = document.createElement('div')
            for (let i = 0; i < 7; i++)
                for (let j = 0; j < 12; j++)
                    noteList.appendChild(createNote(k + o * trackOneBlockSize, i * 12 + j))

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

            // 인덱싱
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
        }
    }
}

function offAllMIDI() {
    for (let s = 1; s <= 7; s++) {
        for (let i = 0; i < 12; i++) {
            let thisPitch = pitch[i % 12]
            thisPitch += s

            pressedKeyBoard[i] = false
            synth.triggerRelease(thisPitch)
        }

    }
}

function toggleMode(mode) {
    if (typeof mode === "string") mode = document.querySelector(`#${mode}`)

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

function toggleChordHelper() {
    const chordText = document.querySelector('#chordText')
    if (chordText.style.display !== "none") { // 있으면
        console.log('code mode off')
        chordMode = false;

        chordText.style.display = "none"
        clearChord()
    }else { // 없으면
        console.log('code mode on')
        chordMode = true;

        chordInfo = defaultChord

        chordText.style.display = "inline-block"
        chordText.focus()
        chordText.value = 'M'

        //TODO:   vvv check chord 메서드를 추가해 싱글톤을 완벽하게 정리 시키기
        renderChord()
    }


}

function resetNavigate() {
    const navigate = document.querySelector("#navigate")

    if (isPlaying) {
        stop()

        isPlaying = !isPlaying
    }
    if (isIndexed) isIndexed = false;

    navigateAt = 0

    navigate.style.marginLeft = `${- scrollX + 136}px`
    navigateX = -scrollX + 136

    offAllMIDI()
}

let chordNotes = []

function clearChord() {
    for (const chordNote of chordNotes) {
        if (chordNote) {
            chordNote.classList.remove("preview")
            chordNote.classList.remove("conflict")
        }
    }

    chordNotes = []
}

let isConflict

function renderChord() {

    clearChord()

    const isBased = !!chordInfo.scale // 기초 화음을 알려주냐고

    const flat = onMousePitch.charAt(1) === "#"

    const parsedPitch = parsePitch(onMousePitch)
    const thisPitch = onMousePitch.substring(0, 1 + flat)
    const scale = onMousePitch.charAt(1 + flat)

    // 노트들 쿼리셀렉터로 집어주기

    for (const note of chordInfo.notes) {
        chordNotes.push(document.querySelector(`[data-x="${onMouseX}"][data-pitch="${getPitch(
            (isBased) ? 
                84 - scale * 12 + 11 - note - pitch.indexOf(chordInfo.scale) :
                parsedPitch - note
        )}"]`))
    }

    if (chordNotes.includes(null)) {
        clearChord()

        return
    }

    if (!chordModeIsOK) {
        clearChord()

        return
    }

    isConflict = chordNotes.filter((value) => value.classList.contains("inserted")).length > 0

    for (const chordNote of chordNotes) {
        chordNote.classList.add("preview")
        if (isConflict) chordNote.classList.add("conflict")
    }

}

document.addEventListener('click', (e) => {
    e.preventDefault()
})

document.addEventListener('mousedown', (e) => {
    if (chordMode && chordModeIsOK) {
        if (chordNotes.length > 0 && !isConflict) {
            for (const note of chordNotes) {
                saveNote(note)
            }

            rendering()
        }
    }
})

document.addEventListener('mousemove', (e) => {

    const codeText = document.querySelector('#chordText')

    if (codeText) {
        let mouseX = e.pageX + 28 - scrollX; // document의 x좌표값
        let mouseY = e.pageY + 20 - scrollY; // document의 y좌표값

        codeText.style.left = mouseX + 'px';
        codeText.style.top = mouseY + 'px';
    }
})

document.addEventListener("DOMContentLoaded", () => {
    // 노트 양산 + 위치표 양산
    const navigator = document.querySelector("#navigatorBar")
    const navigate = document.querySelector("#navigate")

    createTrackInfoNewOne(1)
    rendering()


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
    layerList.appendChild(createLayer())

    // 트랙 추가 반응
    const addLayer = document.querySelector("#addLayer")
    addLayer.addEventListener('click', () => {
        layerList.appendChild(createLayer())
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

    // MODE 온 오프 딸깍 딸깍
    const modes = document.querySelectorAll(".mode")

    modes.forEach((mode) => {
        mode.addEventListener('click', () => {
            toggleMode(mode)
        })
    })

    // 트랙 사이즈 변경
    const beat = document.querySelector("#beatValue")
    const size = document.querySelector("#layerLength")

    beat.addEventListener('blur', () => {
        if(isNaN(beat.value) || beat.value <= 0) {
            beat.value = trackOneBlockSize
        }else {
            resetNavigate()

            trackOneBlockSize = beat.value
            overwriteAllTrackBySize()
            rendering()
        }
    })

    size.addEventListener('blur', () => {
        if(isNaN(size.value) || size.value <= 0) {
            size.value = trackLongSize
        }else {
            resetNavigate()

            trackLongSize = size.value
            overwriteAllTrackBySize()
            rendering()
        }
    })

    // 파일 받기 이벤트
    const area = document.querySelector("#file")
    const input = document.querySelector("#file-input")

    area.addEventListener('dragover', (e) => {
        e.preventDefault()
        area.style.backgroundColor = "#b3b3b3"
    })

    area.addEventListener('dragleave', () => {
        area.style.backgroundColor = "#d9d9d9"
    })

    area.addEventListener('drop', (event) => {
        event.preventDefault()
        const file = event.dataTransfer.files[0];
        if (file && file.type === "application/json") {
            if (confirm("현재 모든 트랙을 덮어 씁니다. 괜찮습니까?")) {
                file.text().then((it) => {
                    const parsed = JSON.parse(it)

                    try {
                        bpm.value = parsed.bpm
                        bpmReset()
                        aliveLayer = parsed.layer

                        deleteLayerQueue.splice(deleteLayerQueue.length - 1)

                        const empty = []
                        for (let i = 1; i <= Math.max(...aliveLayer); i++) {
                            empty.push(i)
                        }

                        for (const aliveNum of aliveLayer) {
                            empty.splice(empty.indexOf(aliveNum), 1)
                        }

                        for (const item of empty) {
                            deleteLayerQueue.push(item)
                        }

                        trackOneBlockSize = parsed.byteSize
                        trackLongSize = parsed.trackSize

                        thisTrackNum = Math.min(...aliveLayer)
                        layerCount = Math.max(...aliveLayer) + 1

                        for (const key of Object.keys(trackInfos)) {
                            delete trackInfos[key]
                        }

                        layerList.innerHTML = ''
                        for (const idx of parsed.layer) {
                            layerList.appendChild(createLayer(idx))
                        }

                        for (const note of parsed.notes) {
                            const thisArray = trackInfos[note.layer][note.x]

                            const noteObj = Note(
                                note.pitch,
                                note.x,
                                note.layer,
                                note.status
                            )

                            thisArray.push(noteObj)
                        }

                        rendering()
                    }catch (e) {
                        console.log(e)
                        alert("파일이 손상되었거나, 버그가 발생했습니다. 디스코드 zios___ 으로 dm 해주세욘")
                    }


                }).catch((err) => {
                    console.log(err)
                })

            }
        }else {
            alert("잘못된 파일 형식입니다. 다시 확인해주세요.")
        }
        area.style.backgroundColor = "#d9d9d9"
    })

    area.addEventListener('click', () => {
        input.click()
    })

    // 세이브 파일 받기 이벤트
    const saveButton = document.querySelector("#export")

    saveButton.addEventListener('click', () => {

        const note = []

        aliveLayer.forEach((value) => {
            trackInfos[value].forEach((array) => {
                if(array.length !== 0) {
                    for (const node of array) {
                        note.push(
                            Note(
                                node.pitch,
                                note.x,
                                value,
                                node.status
                            )
                        )
                    }
                }
            })
        })

        note.sort((a, b) => a.x - b.x)

        const object = {
            bpm: bpm.value,
            byteSize: trackOneBlockSize,
            trackSize: trackLongSize,
            layer: aliveLayer,
            notes: note
        }

        const url = URL.createObjectURL(
            new Blob([JSON.stringify(object)], { type: 'application/json' })
        )

        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = "dj-save.json"
        anchor.click();

        URL.revokeObjectURL(url)
    })

    // 코드 헬퍼 조작작
    const chordHelper = document.querySelector("#chordText")

    chordHelper.addEventListener('blur', (e) => {

        toggleChordHelper()
    })

    chordHelper.addEventListener('input', () => {
        try {
            const chord = chordHelper.value; // String

            const chordRegax = /^([A-G])?([Mm])?(\w*)?$/;

            const matches = chord.match(chordRegax)

            if (matches[1] === matches[2] &&
                matches[2] === matches[3] &&
                matches[3] === undefined ||
                matches[3] !== undefined &&
                !["aug", "sus2", "sus4", "dim", "7", "9", "11", "13"].includes(matches[3])) {
                throw "u dont no chord?"
            }

            const setChord = {
                scale: matches[1],
                m: matches[2],
                additional: matches[3],
                notes: [0, 4, 7] // default : M
            }

            let M3rd = true

            if (setChord.additional !== undefined){
                if (!isNaN(setChord.additional)) { // 도미넌트 화음류 (add는 취급 안해요)
                    let dominant = Number(setChord.additional)

                    if (dominant >= 7) {
                        setChord.notes.push(10)
                    }
                    if (dominant >= 9) {
                        setChord.notes.push(14)
                    }
                    if (dominant >= 11) {
                        setChord.notes.push(17)
                    }
                    if (dominant >= 13) {
                        setChord.notes.push(21)
                    }

                }else {
                    if (setChord.additional === "aug") {
                        setChord.notes[2] += 1
                    }
                    if (setChord.additional.startsWith("sus")) {
                        let num = setChord.additional.charAt(3)

                        if (num === "2") {
                            setChord.notes[1] -= 2
                        }else {
                            setChord.notes[1] += 1
                        }

                        M3rd = false;
                    }
                    if (setChord.additional === "dim") {
                        setChord.notes[1] -= 1
                        setChord.notes[2] -= 1
                    }
                }
            }

            if (M3rd && setChord.m === "m") { // sus가 장 3도를 죽인다면 당연히 m 의 의미가 없어짐
                setChord.notes[1] -= 1
            }else if(setChord.m === "M") {

                if (setChord.notes.length > 3) {
                    setChord.notes[3] += 1
                }
            }

            chordInfo = setChord


            chordModeIsOK = true;
            chordHelper.style.backgroundColor = "#ffffffdd"
            renderChord()
        }catch (e) {
            chordModeIsOK = false;
            chordHelper.style.backgroundColor = "#ff000099"
            renderChord()
        }

    })

    window.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
            if (!chordMode) {
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

                    playNavigateId = setInterval(() => playNavigate(bpm.value), 10)
                    playMusic()
                    playMusicId = setInterval(playMusic, 60 / bpm.value * 1000 / beat.value)
                }else {

                    console.log("stop!")
                    stop()
                    offAllMIDI()
                }

                isPlaying = !isPlaying
            }
        }

        if (event.key === 'Escape') {
            if (chordMode) {
                chordHelper.blur()
            }else {
                resetNavigate()
            }
        }

        if (!chordMode && event.key.toLowerCase() === 'b') {
            toggleMode("brush")

            console.log(`brush mode ${(brushMode) ? "on" : "off"}`)
        }

        if (!chordMode && event.key.toLowerCase() === 'm') {
            toggleMode("midi")

            console.log(`midi mode ${(midiMode) ? "on" : "off"}`)
        }

        if (!chordMode && ['<', ',', '>', '.'].includes(event.key)) {
            let idx = ['<', ',', '>', '.'].indexOf(event.key)

            offAllMIDI()

            if (idx < 3 && midiScale > 1) midiScale--
            else if (idx > 2 && midiScale < 7) midiScale++
        }

        if (!chordMode && event.key.toLowerCase() === 'c') {
            event.preventDefault()
            offAllMIDI()
            toggleChordHelper()
        }

        if (!chordMode && keyBoardMIDIList.indexOf(event.key.toLowerCase()) !== -1 && midiMode) {
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
        if (!chordMode && keyBoardMIDIList.indexOf(event.key.toLowerCase()) !== -1 && midiMode) {
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