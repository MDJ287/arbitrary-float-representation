
class FloatType {
    static HALF = new FloatType(1, 5, 10);
    static SINGLE = new FloatType(1, 8, 23);
    static DOUBLE = new FloatType(1, 11, 52);

    constructor(signBits, exponentBits, mantissaBits) {
        this.signBits = signBits;
        this.exponentBits = exponentBits;
        this.mantissaBits = mantissaBits;
    }

    get bits() {
        return this.signBits + this.exponentBits + this.mantissaBits;
    }

    get bias() {
        return this.exponentBits < 1 ? 0n : (1n<<BigInt(this.exponentBits-1))-1n;
    }

    get biggestExponent() {
        return (1n<<BigInt(this.exponentBits))-1n;
    }
}

class Float {


    /**
     * 
     * @param {FloatType} floatType 
     * @param {string|undefined} bits 
     */
    constructor(floatType, bits) {
        this.floatType = floatType;
        this.sign = false;
        this.exponent = 0n;
        this.mantissa = 0n;

        if (bits) {
            switch (typeof bits) {
                case 'string':
                    if (bits.length !== floatType.bits) throw new TypeError('string should have the same number of bits as float type');
                    
                    if (this.floatType.signBits > 0n) this.sign = Boolean(BigInt(bits[0]));
                    this.exponent = BigInt('0b'+(bits.substring(this.floatType.signBits, this.floatType.signBits + this.floatType.exponentBits) || 0));
                    this.mantissa = BigInt('0b'+(bits.substring(this.floatType.signBits + floatType.exponentBits) || 0));
                    break;
                case 'bigint':
                    this.bits = bits;
                    break;
                default:
                    throw new TypeError('bits is invalid type');
            }
        }
    }

    toString() {
        if (this.exponent === this.floatType.biggestExponent && this.floatType.biggestExponent > 0) {
            if (this.mantissa === 0n) return this.stringSign() + 'Infinity'
            return 'NaN';
        }

        try {
            const underflow = this.exponent === 0n;
            const exp = underflow ? 1n-this.floatType.bias : this.exponent-this.floatType.bias;
            const mantissaValue = (underflow ? 0n : (1n << BigInt(this.floatType.mantissaBits))) + this.mantissa;
            const fiveExponent = (BigInt(this.floatType.mantissaBits) - exp);
            const base10Value = mantissaValue * (fiveExponent < 0 ? 2n**-fiveExponent : 5n**fiveExponent);

            const base10String = base10Value.toString().padStart(this.floatType.mantissaBits - Number(exp), 0);
            const decimalPlace = base10String.length - this.floatType.mantissaBits + Number(exp);

            return `${this.stringSign()}${base10String.substring(0, decimalPlace) || '0'}.${base10String.substring(decimalPlace) || '0'}`;
        }
        catch (e) {
            if (e instanceof RangeError) {
                alert('maximum BigInt size exceeded! use fewer bits!');
            }
        }
    }

    stringSign() {
        return this.sign?'-':'';
    }

    bitString() {
        return this.bits.toString(2).padStart(this.floatType.bits, '0');
    }

    get bits() {
        return this.mantissa +
            (this.exponent << BigInt(this.floatType.mantissaBits)) +
            ((this.sign?1n:0n) << BigInt(this.floatType.exponentBits + this.floatType.mantissaBits));
    }

    set bits(value) {
        this.sign = (value & (1n << BigInt(this.floatType.exponentBits + this.floatType.mantissaBits))) > 0;
        this.exponent = (value & (((1n << BigInt(this.floatType.exponentBits)) - 1n) << BigInt(this.floatType.mantissaBits))) >> BigInt(this.floatType.mantissaBits);
        this.mantissa = value & ((1n << BigInt(this.floatType.mantissaBits)) - 1n);
    }

    isNaN() {
        return this.exponent === this.floatType.biggestExponent && this.mantissa !== 0n;
    }
}

/**
 * 
 * @param {string} bits 
 */
function realFloatToString(bits) {
    if (bits.length !== 16 && bits.length !== 32 && bits.length !== 64) throw new TypeError('bits has to be legal size');
    const isDouble = bits.length >= 64;
    const IntClass = {16: Uint16Array, 32: Uint32Array, 64: BigUint64Array}[bits.length];
    const FloatClass = {16: Float16Array, 32: Float32Array, 64: Float64Array}[bits.length];
    const intArr = new IntClass(1);
    const value = BigInt('0b'+bits);
    intArr[0] = isDouble ? value : Number(value);
    const buffer = intArr.buffer;
    const floatArr = new FloatClass(buffer);
    return floatArr[0];
}

let currentType = FloatType.SINGLE;
let currentNumber = new Float(currentType);

onload = () => {
    document.getElementById('pre-16').onclick = () => loadPreset(FloatType.HALF);
    document.getElementById('pre-32').onclick = () => loadPreset(FloatType.SINGLE);
    document.getElementById('pre-64').onclick = () => loadPreset(FloatType.DOUBLE);

    document.getElementById('sign-in').oninput = () => changeSize();
    document.getElementById('exp-in').oninput = () => changeSize();
    document.getElementById('man-in').oninput = () => changeSize();

    document.getElementById('enumerate-all').onclick = () => enumerateAll();

    document.getElementById('randomize').onclick = () => randomizeBits();

    document.getElementById('exp-dec').onclick = () => addTo('exponent', -1);
    document.getElementById('exp-inc').onclick = () => addTo('exponent', 1);
    document.getElementById('man-dec').onclick = () => addTo('mantissa', -1);
    document.getElementById('man-inc').onclick = () => addTo('mantissa', 1);
    document.getElementById('dec').onclick = () => addTo('bits', -1);
    document.getElementById('inc').onclick = () => addTo('bits', 1);

    loadPreset(FloatType.SINGLE);
}

/**
 * 
 * @param {FloatType} preset 
 */
function loadPreset(preset) {
    currentType = preset;

    document.getElementById('sign-in').value = currentType.signBits;
    document.getElementById('exp-in').value = currentType.exponentBits;
    document.getElementById('man-in').value = currentType.mantissaBits;
    displayAfterChangeSize();
}

function changeSize() {
    currentType = new FloatType(
        Number(document.getElementById('sign-in').value),
        Number(document.getElementById('exp-in').value),
        Number(document.getElementById('man-in').value)
    );
    displayAfterChangeSize();
}

function displayAfterChangeSize() {
    currentNumber = new Float(currentType);
    document.getElementById('total-in').value = currentType.bits;

    document.getElementById('sign-display').textContent = '';
    document.getElementById('exponent-display').textContent = '';
    document.getElementById('mantissa-display').textContent = '';

    for (let i=0; i<currentType.signBits; i++) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.oninput = () => changeNum();
        document.getElementById('sign-display').appendChild(input);
    }
    for (let i=0; i<currentType.exponentBits; i++) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.oninput = () => changeNum();
        document.getElementById('exponent-display').appendChild(input);
    }
    for (let i=0; i<currentType.mantissaBits; i++) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.oninput = () => changeNum();
        document.getElementById('mantissa-display').appendChild(input);
    }

    changeNum();
}

function displayCurNum(setCheckboxes=true) {
    document.getElementById('cur-str').textContent = currentNumber.toString();

    const underflow = currentNumber.exponent === 0n;
    const signValue = currentNumber.sign ? '-' : '+';
    const expValue = (underflow ? 1n-currentNumber.floatType.bias : currentNumber.exponent - currentNumber.floatType.bias).toString();
    const manValue = (underflow ? '0' : '1')+'.'+(currentNumber.mantissa * 5n**BigInt(currentNumber.floatType.mantissaBits)).toString().padStart(currentNumber.floatType.mantissaBits, '0'); // m/2^M * 10^M = m*5^M

    document.getElementById('calculation').textContent = signValue + manValue + '*2^' + expValue;

    document.getElementById('sign-bit-disp').textContent = Number(currentNumber.sign).toString(2).padStart(currentNumber.floatType.signBits, '0');
    document.getElementById('exp-bit-disp').textContent = currentNumber.exponent.toString(2).padStart(currentNumber.floatType.exponentBits, '0');
    document.getElementById('man-bit-disp').textContent = currentNumber.mantissa.toString(2).padStart(currentNumber.floatType.mantissaBits, '0');

    document.getElementById('sign-value-disp').textContent = signValue;
    document.getElementById('exp-value-disp').textContent = expValue + (underflow ? '*' : '');
    document.getElementById('man-value-disp').textContent = manValue;

    document.getElementById('special-case').textContent = underflow ?
        `underflow (exponent is all 0s, so 0<=mantissa<1 and exponent is treated as ${1n-currentNumber.floatType.bias})` :
        currentNumber.exponent === currentNumber.floatType.biggestExponent ?
            'overflow (exponent is all 1s, so the number is NaN or infinite depending in the mantissa)' :
            '-';
    
    document.getElementById('js-version').textContent = '-';

    if (currentNumber.floatType === FloatType.HALF || currentNumber.floatType === FloatType.SINGLE || currentNumber.floatType === FloatType.DOUBLE) {
        document.getElementById('js-version').textContent = realFloatToString(currentNumber.bitString());
    }

    if (setCheckboxes) {
        Array.from(document.getElementById('sign-display').children).forEach(element => element.checked = currentNumber.sign);
        Array.from(document.getElementById('exponent-display').children).forEach((element, i, arr) => element.checked = ((currentNumber.exponent & (1n << BigInt(arr.length-1-i))) > 0n));
        Array.from(document.getElementById('mantissa-display').children).forEach((element, i, arr) => element.checked = ((currentNumber.mantissa & (1n << BigInt(arr.length-1-i))) > 0n));
    }
}

function changeNum() {
    const signBits = Array.from(document.getElementById('sign-display').children).map(element => element.checked);
    const expBits = Array.from(document.getElementById('exponent-display').children).map(element => element.checked);
    const manBits = Array.from(document.getElementById('mantissa-display').children).map(element => element.checked);
    
    let newSign = signBits[signBits.length-1] ?? false;
    let newExp = 0n;
    expBits.forEach((x, i, arr) => {
        if (x) newExp |= 1n<<BigInt(arr.length-1-i);
    });
    let newMan = 0n;
    manBits.forEach((x, i, arr) => {
        if (x) newMan |= 1n<<BigInt(arr.length-1-i);
    });

    currentNumber.sign = newSign;
    currentNumber.exponent = newExp;
    currentNumber.mantissa = newMan;

    displayCurNum(false);
}

function enumerateAll() {
    const numValues = 1n<<BigInt(currentNumber.floatType.bits);
    if (currentNumber.floatType.bits > 12) {
        if (!confirm(`are you sure you want to enumerate all ${numValues} values? it could take some time (or crash). consider using fewer bits.`)) return;
    }
    const table = document.getElementById('enumerated-values');
    table.textContent = '';
    const headingTr = document.createElement('tr');
    table.appendChild(headingTr);
    const headingThs = [document.createElement('th'), document.createElement('th')];
    headingThs[0].textContent = 'bits';
    headingThs[1].textContent = 'float';
    headingTr.append(...headingThs);
    for (let i=0n; i<numValues; i++) {
        const tr = document.createElement('tr');
        table.appendChild(tr);
        const str = numValues === 1n ? '' : i.toString(2).padStart(currentNumber.floatType.bits, '0');
        const bitsTd = document.createElement('td');
        bitsTd.textContent = str;
        const floatTd = document.createElement('td');
        floatTd.textContent = new Float(currentNumber.floatType, str).toString();
        tr.append(bitsTd, floatTd);
    }
}

function randomizeBits() {
    Array.from(document.getElementById('sign-display').children).forEach(element => element.checked = Math.random() < 0.5);
    Array.from(document.getElementById('exponent-display').children).forEach(element => element.checked = Math.random() < 0.5);
    Array.from(document.getElementById('mantissa-display').children).forEach(element => element.checked = Math.random() < 0.5);

    changeNum();
}

function addTo(prop, amount) {
    currentNumber[prop] += BigInt(amount);
    const maxValue = 1n << BigInt(currentNumber.floatType[prop === 'bits' ? prop : (prop + 'Bits')]);
    if (currentNumber[prop] >= maxValue) {
        currentNumber[prop] -= maxValue;
    }
    if (currentNumber[prop] < 0) {
        currentNumber[prop] += maxValue;
    }
    console.log(maxValue);
    displayCurNum();
}
