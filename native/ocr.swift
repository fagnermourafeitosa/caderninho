import Foundation
import Vision
import ImageIO
import PDFKit

do {
    guard CommandLine.arguments.count == 2 else { throw NSError(domain: "OCR", code: 1) }
    let url = URL(fileURLWithPath: CommandLine.arguments[1])
    if url.pathExtension.lowercased() == "pdf" {
        guard let document = PDFDocument(url: url) else { throw NSError(domain: "PDF", code: 1) }
        let title = document.documentAttributes?[PDFDocumentAttribute.titleAttribute] as? String ?? ""
        var text = ""
        for index in 0..<min(document.pageCount, 3) {
            text += (document.page(at: index)?.string ?? "") + "\n"
            if text.count >= 800 { break }
        }
        let data = try JSONSerialization.data(withJSONObject: ["title": title.trimmingCharacters(in: .whitespacesAndNewlines), "text": String(text.prefix(4000))])
        FileHandle.standardOutput.write(data)
        exit(0)
    }
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
