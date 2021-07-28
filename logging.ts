import {
    yellow,
    bold,
    red
} from "https://deno.land/std@0.103.0/fmt/colors.ts";

export const warn = (...data: unknown[]) => {
    let string = yellow(bold('WARNING: '))
    string += Array.from(data).join(' ');
    console.log(string);
}

export const error = (...data: unknown[]) => {
    let string = red(bold('ERROR: '))
    string += Array.from(data).join(' ');
    console.error(string);
}