pub fn parse_card_texts(input: &str) -> Vec<String> {
    let normalized = input.replace("\r\n", "\n").replace('\r', "\n");
    if normalized.lines().any(is_timing_line) {
        let mut cards = Vec::new();
        let mut cue = Vec::new();
        let mut in_cue = false;
        for line in normalized.lines().chain(std::iter::once("")) {
            if line.trim().is_empty() {
                if let Some(text) = normalize_card_text(&cue.join(" ")) {
                    cards.push(text);
                }
                cue.clear();
                in_cue = false;
            } else if is_timing_line(line) {
                in_cue = true;
            } else if in_cue {
                cue.push(line);
            }
        }
        cards
    } else {
        normalized.lines().filter_map(normalize_card_text).collect()
    }
}

fn is_timing_line(line: &str) -> bool {
    let mut parts = line.split_whitespace();
    matches!((parts.next(), parts.next(), parts.next()),
        (Some(start), Some("-->"), Some(end)) if is_timestamp(start) && is_timestamp(end))
}

fn is_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 12
        && bytes.iter().enumerate().all(|(index, byte)| match index {
            2 | 5 => *byte == b':',
            8 => matches!(*byte, b',' | b'.'),
            _ => byte.is_ascii_digit(),
        })
}

fn normalize_card_text(text: &str) -> Option<String> {
    let normalized = text.split_whitespace().collect::<Vec<_>>().join(" ");
    (!normalized.is_empty()).then_some(normalized)
}
