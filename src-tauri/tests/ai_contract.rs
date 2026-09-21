use lingua_nexus_lib::ai::{translate, AiConfig};
use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
    time::Duration,
};

fn fixture(status: &str, body: &str, delay: Duration) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let response = format!("HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
    thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut data = [0; 16384];
        let _ = stream.read(&mut data);
        thread::sleep(delay);
        let _ = stream.write_all(response.as_bytes());
    });
    format!("http://{address}/v1")
}
fn config(base: String) -> AiConfig {
    AiConfig::new(base, "fixture-model".into(), "fixture-secret".into()).unwrap()
}
#[test]
fn compatible_success_and_output_validation() {
    let base = fixture(
        "200 OK",
        r#"{"choices":[{"message":{"content":"{\"translation\":\"你好\"}"}}]}"#,
        Duration::ZERO,
    );
    assert_eq!(
        translate(config(base), "Hello".into(), Duration::from_secs(2)).unwrap(),
        "你好"
    );
    for body in [
        r#"{"choices":[]}"#,
        r#"{"choices":[{"message":{"content":"not JSON"}}]}"#,
        r#"{"choices":[{"message":{"content":"{\"translation\":\"\"}"}}]}"#,
    ] {
        let base = fixture("200 OK", body, Duration::ZERO);
        assert!(translate(config(base), "Hello".into(), Duration::from_secs(2)).is_err());
    }
}
#[test]
fn provider_errors_and_timeout_are_safe() {
    for (status, expected) in [
        ("401 Unauthorized", "AI_API_KEY"),
        ("429 Too Many Requests", "quota"),
        ("302 Found", "redirect"),
        ("500 Server Error", "unavailable"),
    ] {
        let base = fixture(
            status,
            "fixture-secret provider private payload",
            Duration::ZERO,
        );
        let error = translate(config(base), "Hello".into(), Duration::from_secs(2)).unwrap_err();
        assert!(error.contains(expected), "{error}");
        assert!(!error.contains("fixture-secret"));
    }
    let base = fixture("200 OK", "{}", Duration::from_millis(150));
    assert!(
        translate(config(base), "Hello".into(), Duration::from_millis(30))
            .unwrap_err()
            .contains("timed out")
    );
}
#[test]
fn rejects_unsafe_config_and_oversized_input() {
    for base in [
        "http://example.com/v1",
        "https://user:pass@example.com/v1",
        "https://example.com/v1?key=secret",
        "file:///tmp/test",
    ] {
        assert!(AiConfig::new(base.into(), "model".into(), "secret".into()).is_err());
    }
    assert!(translate(
        config("http://127.0.0.1:1/v1".into()),
        "x".repeat(20001),
        Duration::from_secs(1)
    )
    .is_err());
}
