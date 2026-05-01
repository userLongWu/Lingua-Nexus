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
        normalized.lines().filter_map(normalize_card_text).collect()
    }
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
