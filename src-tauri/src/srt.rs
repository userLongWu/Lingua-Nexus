pub fn parse_card_texts(input: &str) -> Vec<String> {
    let normalized = input.replace("\r\n", "\n").replace('\r', "\n");
    let blocks: Vec<&str> = normalized.split("\n\n").collect();

    if normalized.contains("-->") {
        blocks
            .iter()
            .filter_map(|block| {
                let text = block
                    .lines()
                    .filter_map(|line| {
                        let trimmed = line.trim();
                        if trimmed.is_empty()
                            || trimmed.chars().all(|ch| ch.is_ascii_digit())
                            || trimmed.contains("-->")
                        {
                            None
                        } else {
                            Some(trimmed)
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");

                normalize_card_text(&text)
            })
            .collect()
    } else {
        normalized
            .lines()
            .flat_map(split_plain_text_line)
            .filter_map(|text| normalize_card_text(&text))
            .collect()
    }
}

fn split_plain_text_line(line: &str) -> Vec<String> {
    let mut sentences = Vec::new();
    let mut current = String::new();

    for ch in line.chars() {
        current.push(ch);
        if matches!(ch, '.' | '!' | '?' | '。' | '！' | '？') {
            let sentence = current.trim();
            if !sentence.is_empty() {
                sentences.push(sentence.to_string());
            }
            current.clear();
        }
    }

    let remaining = current.trim();
    if !remaining.is_empty() {
        sentences.push(remaining.to_string());
    }

    sentences
}

fn normalize_card_text(text: &str) -> Option<String> {
    let trimmed = text
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string();

    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}
