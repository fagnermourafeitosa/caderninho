import Foundation
import Vision
import ImageIO

do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "OCR", code: 1) }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    let supported = try request.supportedRecognitionLanguages()
    request.recognitionLanguages = ["pt-BR", "pt-PT", "en-US"].filter { supported.contains($0) }
    try VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[1])).perform([request])
    let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    let data = try JSONSerialization.data(withJSONObject: ["text": text])
    FileHandle.standardOutput.write(data)
} catch {
    FileHandle.standardError.write(Data(error.localizedDescription.utf8))
    exit(1)
}
