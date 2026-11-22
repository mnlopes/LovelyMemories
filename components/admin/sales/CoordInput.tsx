"use client";

import { useState } from "react";
import { parseCoordInput } from "@/lib/sales/geo";
import { input } from "./ui";

/**
 * Latitude / longitude field typed by hand. A text field (not type=number with a decimal keypad),
 * because the iOS decimal keyboard has no minus key and every longitude in Portugal is negative.
 * The text is kept locally so "-" or "-8." can be typed; only a valid in-range number is stored,
 * anything else leaves the stored value as it was.
 */
export function CoordInput({
    value,
    onChange,
    limit,
    placeholder,
}: {
    value: number | null;
    onChange: (v: number | null) => void;
    limit: number;
    placeholder: string;
}) {
    const [text, setText] = useState(value === null ? "" : String(value));
    const [prev, setPrev] = useState(value);
    const [invalid, setInvalid] = useState(false);

    // A value set from outside (map click, pasted link) replaces what is shown.
    if (value !== prev) {
        setPrev(value);
        const parsed = parseCoordInput(text, limit);
        if (!(parsed.ok && parsed.value === value)) {
            setText(value === null ? "" : String(value));
            setInvalid(false);
        }
    }

    return (
        <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            value={text}
            aria-invalid={invalid ? true : undefined}
            onChange={(e) => {
                setText(e.target.value);
                const parsed = parseCoordInput(e.target.value, limit);
                setInvalid(!parsed.ok);
                if (parsed.ok) {
                    setPrev(parsed.value);
                    onChange(parsed.value);
                }
            }}
            onBlur={() => {
                if (invalid) {
                    setText(value === null ? "" : String(value));
                    setInvalid(false);
                }
            }}
            className={`${input} ${invalid ? "border-red-500" : ""}`}
        />
    );
}
