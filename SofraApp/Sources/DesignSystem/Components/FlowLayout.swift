// FlowLayout.swift
// A flexible flow layout for wrapping chips/tags

import SwiftUI

struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    var alignment: HorizontalAlignment = .trailing  // RTL support
    
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            
            if currentX + size.width > maxWidth && currentX > 0 {
                // Move to next line
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
            totalHeight = currentY + lineHeight
        }
        
        return CGSize(width: maxWidth, height: totalHeight)
    }
    
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var currentX: CGFloat = bounds.maxX  // Start from right for RTL
        var currentY: CGFloat = bounds.minY
        var lineHeight: CGFloat = 0
        
        // First pass: calculate line breaks
        var lines: [[Subviews.Element]] = [[]]
        var lineWidths: [CGFloat] = [0]
        
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            
            if lineWidths[lines.count - 1] + size.width + spacing > bounds.width && !lines[lines.count - 1].isEmpty {
                lines.append([])
                lineWidths.append(0)
            }
            
            lines[lines.count - 1].append(subview)
            lineWidths[lines.count - 1] += size.width + (lines[lines.count - 1].count > 1 ? spacing : 0)
        }
        
        // Second pass: place subviews
        for (lineIndex, line) in lines.enumerated() {
            // Calculate line height
            lineHeight = line.map { $0.sizeThatFits(.unspecified).height }.max() ?? 0
            
            // Start from right (RTL)
            currentX = bounds.maxX
            
            for subview in line {
                let size = subview.sizeThatFits(.unspecified)
                currentX -= size.width
                
                subview.place(
                    at: CGPoint(x: currentX, y: currentY),
                    proposal: ProposedViewSize(size)
                )
                
                currentX -= spacing
            }
            
            currentY += lineHeight + spacing
        }
    }
}

#Preview {
    FlowLayout(spacing: 8) {
        ForEach(["المكونات غير متوفرة", "المطعم مغلق", "ضغط عمل", "خطأ", "العنوان غير واضح"], id: \.self) { text in
            Text(text)
                .font(.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.gray.opacity(0.2))
                .clipShape(Capsule())
        }
    }
    .padding()
}
