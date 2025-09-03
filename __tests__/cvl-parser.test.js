import { beforeAll, expect, test } from 'vitest';

let _cvl = null;

beforeAll(async () => {
    await require('../cvl/cvlLoader.js').then(([{ default: cvl }]) => { _cvl = cvl });
})

test('boolean literal true', () => {
    expect(_cvl.parse("true")
    ).toBe(true);
});

test('boolean literal false', () => {
    expect(_cvl.parse("false")
    ).toBe(false);
});

test('string literal', () => {
    expect(_cvl.parse("'abc'")
    ).toBe('abc');
});

test('number literal integer 1', () => {
    expect(_cvl.parse("1")
    ).toBe(1);
});

test('number literal integer -1', () => {
    expect(_cvl.parse("-1")
    ).toBe(-1);
});

test('number literal zero 0', () => {
    expect(_cvl.parse("0")
    ).toBe(0);
});

test('number literal decimal 1.0', () => {
    expect(_cvl.parse("1.0")
    ).toBe(1);
});

test('number literal decimal 0.1', () => {
    expect(_cvl.parse("0.1")
    ).toBe(0.1);
});

test('number literal decimal 1.2', () => {
    expect(_cvl.parse("1.2")
    ).toBe(1.2);
});

test('number literal decimal -1.0', () => {
    expect(_cvl.parse("-1.0")
    ).toBe(-1);
});

test('number literal decimal -0.1', () => {
    expect(_cvl.parse("-0.1")
    ).toBe(-0.1);
});

test('number literal decimal -1.2', () => {
    expect(_cvl.parse("-1.2")
    ).toBe(-1.2);
});

test('number literal long 1L', () => {
    expect(_cvl.parse("1L")
    ).toBe(1n);
});

test('number literal long -1L', () => {
    expect(_cvl.parse("-1L")
    ).toBe(-1n);
});

test('number literal long zero 0L', () => {
    expect(_cvl.parse("0L")
    ).toBe(0n);
});

test('datetime literal with T only', () => {
    expect(_cvl.parse("@2025-01-01T")
    ).toBe("@2025-01-01T");
});

test('datetime literal with time', () => {
    expect(_cvl.parse("@2025-01-01T12:34:56.789")
    ).toBe("@2025-01-01T12:34:56.789");
});

test('date literal complete', () => {
    expect(_cvl.parse("@2025-01-01")
    ).toBe("@2025-01-01");
});

test('date literal YYYY-MM only', () => {
    expect(_cvl.parse("@2025-01")
    ).toBe("@2025-01");
});

test('date literal YYYY only', () => {
    expect(_cvl.parse("@2025")
    ).toBe("@2025");
});

test('time literal', () => {
    expect(_cvl.parse("@T12:34:56.789")
    ).toBe("@T12:34:56.789");
});

test('time literal HH:MM only', () => {
    expect(_cvl.parse("@T12:34")
    ).toBe("@T12:34");
});

test('time literal HH only', () => {
    expect(_cvl.parse("@T12")
    ).toBe("@T12");
});

test('quantity literal no units', () => {
    expect(_cvl.parse("1")
    ).toStrictEqual(1);
});

test('quantity literal', () => {
    expect(_cvl.parse("1 'g'")
    ).toStrictEqual({value:1,unit:'g'});
});

test('ratio literal', () => {
    expect(_cvl.parse("1 'g':2 'g'")
    ).toStrictEqual({numerator:{value:1,unit:'g'},denominator:{value:2,unit:'g'}});
});

test('interval literal hi and low closed', () => {
    expect(_cvl.parse("Interval[1,2]")
    ).toStrictEqual({high:2,highClosed:true,low:1,lowClosed:true});
});

test('interval literal only hi closed', () => {
    expect(_cvl.parse("Interval[1,2)")
    ).toStrictEqual({high:2,highClosed:false,low:1,lowClosed:true});
});

test('interval literal only low closed', () => {
    expect(_cvl.parse("Interval(1,2]")
    ).toStrictEqual({high:2,highClosed:true,low:1,lowClosed:false});
});

test('interval literal hi and low open', () => {
    expect(_cvl.parse("Interval(1,2)")
    ).toStrictEqual({high:2,highClosed:false,low:1,lowClosed:false});
});

test('tuple literal', () => {
    expect(_cvl.parse("{name:'Adam',age:42}")
    ).toStrictEqual({name:'Adam',age:42});
});

test('tuple literal with declaration', () => {
    expect(_cvl.parse("Tuple{name:'Adam',age:42}")
    ).toStrictEqual({name:'Adam',age:42});
});

test('list literal', () => {
    expect(_cvl.parse("{1,2,3}")
    ).toStrictEqual([1,2,3]);
});