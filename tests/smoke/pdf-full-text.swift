import Foundation
import PDFKit
let document = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))
print(document?.string ?? "")
